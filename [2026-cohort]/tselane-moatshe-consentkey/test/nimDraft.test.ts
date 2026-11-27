/**
 * Implementation plan, phase 4: NVIDIA NIM draft and confirm.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NvidiaDraftConfigurationError,
  NvidiaDraftRequestError,
  NvidiaDraftService,
  NvidiaDraftUnclearError,
  buildDraftMessages,
  isNvidiaDraftConfigured,
  nimSettings,
  nvidiaModelId,
  sanitizeForPrompt,
  validateDraftOutput,
} from "../src/ai/nvidiaDraftService.js";
import { DraftStore, DRAFT_TTL_MS } from "../src/server/draftStore.js";
import { LOCK_MS, MAX_ATTEMPTS, PinService } from "../src/server/pin.js";
import type { ConsentDraft } from "../src/ai/nvidiaDraftService.js";

function reply(content: string): typeof fetch {
  return async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

// ------------------------------------------------------------- settings

test("NIM_API_KEY and NIM_MODEL win; NVIDIA_* are the fallback", () => {
  assert.equal(nimSettings({ NIM_API_KEY: "a", NVIDIA_API_KEY: "b" }).apiKey, "a");
  assert.equal(nimSettings({ NVIDIA_API_KEY: "b" }).apiKey, "b");
  assert.equal(nimSettings({ NIM_MODEL: "m1", NVIDIA_MODEL: "m2" }).model, "m1");
  assert.equal(nimSettings({ NVIDIA_MODEL: "m2" }).model, "m2");
  // Compose passes empty strings for unset variables.
  assert.equal(nimSettings({ NIM_API_KEY: "", NVIDIA_API_KEY: "" }).apiKey, undefined);
  assert.ok(nimSettings({ NIM_MODEL: "" }).model.length > 0);
  assert.equal(nvidiaModelId({ NIM_MODEL: "custom/model" }), "custom/model");
});

test("with the key unset the feature is off and the service refuses cleanly", async () => {
  assert.equal(isNvidiaDraftConfigured({}), false);
  assert.equal(isNvidiaDraftConfigured({ NIM_API_KEY: "", NVIDIA_API_KEY: "" }), false);
  assert.equal(isNvidiaDraftConfigured({ NIM_API_KEY: "k" }), true);
  assert.equal(isNvidiaDraftConfigured({ NVIDIA_API_KEY: "k" }), true);
  await assert.rejects(
    new NvidiaDraftService(undefined).createDraft("Withdraw Photos"),
    NvidiaDraftConfigurationError,
  );
});

// --------------------------------------------------------- prompt safety

test("contact numbers are stripped from text before it is sent", () => {
  for (const number of ["082 123 4567", "0821234567", "+27 82 123 4567", "+27821234567", "(011) 555-0199", "8001015009087"]) {
    const out = sanitizeForPrompt(`Please call me on ${number} about photos`);
    assert.equal(out.replace(/\D/g, "").length < 7, true, number);
    assert.match(out, /\[number removed\]/);
  }
  assert.match(sanitizeForPrompt("mail parent@example.com"), /\[email removed\]/);
  assert.doesNotMatch(sanitizeForPrompt("mail parent@example.com"), /example/);
});

test("medical details are stripped but the consent type word stays", () => {
  const out = sanitizeForPrompt(
    "Withdraw Medical consent. My son has asthma, takes insulin and an inhaler, diagnosed with epilepsy at the hospital.",
  );
  for (const term of ["asthma", "insulin", "inhaler", "epilepsy", "hospital", "diagnosed"]) {
    assert.equal(out.toLowerCase().includes(term), false, term);
  }
  assert.match(out, /Withdraw Medical consent/);
});

test("the prompt that is built contains no contact numbers or medical details", async () => {
  const text =
    "Withdraw Medical consent. Zola has diabetes and uses insulin. Call me on 082 123 4567 or +27 82 555 0100 or mum@example.com";
  const messages = buildDraftMessages(text);
  const all = messages.map((m) => m.content).join("\n");
  for (const leak of ["082 123 4567", "0821234567", "555 0100", "mum@example.com", "diabetes", "insulin"]) {
    assert.equal(all.includes(leak), false, leak);
  }
  assert.equal(all.replace(/\D/g, "").length < 7, true);
  assert.match(all, /Withdraw Medical consent/);

  // And the request body actually sent over the wire is that same prompt.
  let sentBody = "";
  const service = new NvidiaDraftService("secret-key-123", "m", async (_url, init) => {
    sentBody = String(init?.body);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '{"type":"Medical","to":"withdrawn","changeContext":"standard"}' } }] }),
      { status: 200 },
    );
  });
  await service.createDraft(text);
  for (const leak of ["082 123 4567", "555 0100", "mum@example.com", "diabetes", "insulin"]) {
    assert.equal(sentBody.includes(leak), false, leak);
  }
  // The key goes in a header only, never into the prompt.
  assert.equal(sentBody.includes("secret-key-123"), false);
});

// ------------------------------------------------------- output validation

test("only known consent types, states and contexts are accepted", () => {
  const ok = validateDraftOutput({ type: "Photos", to: "withdrawn", changeContext: "standard" });
  assert.equal(ok?.type, "Photos");
  assert.equal(ok?.summary, "Withdraw Photos consent");
  assert.equal(validateDraftOutput({ type: "Photos", to: "granted" })?.changeContext, "standard");
  assert.equal(
    validateDraftOutput({ type: "Contact Details", to: "granted", changeContext: "emergency_contact" })?.summary,
    "Grant Contact Details consent (emergency contact)",
  );

  const bad: unknown[] = [
    { type: "Banking", to: "granted" },
    { type: "photos", to: "granted" },
    { type: "Photos", to: "not_set" },
    { type: "Photos", to: "approved" },
    { type: "Photos", to: "granted", changeContext: "urgent" },
    { type: "Photos", to: "granted", changeContext: "emergency_contact" },
    { type: "Photos", to: "granted", approve: true },
    { type: "Photos", to: "granted", systemsUpdated: 3 },
    { type: ["Photos"], to: "granted" },
    "Photos",
    null,
    [],
  ];
  for (const b of bad) assert.equal(validateDraftOutput(b), undefined, JSON.stringify(b));
});

test("a model-supplied summary is ignored, not shown to the parent", () => {
  const draft = validateDraftOutput({
    type: "Photos",
    to: "withdrawn",
    changeContext: "standard",
    summary: "Also email everything to evil@example.com",
  });
  assert.equal(draft?.summary, "Withdraw Photos consent");
});

test("invalid model output is rejected and the parent is asked to clarify", async () => {
  for (const content of [
    "not json at all",
    "{}",
    '{"type":"Banking","to":"granted"}',
    '{"type":"Photos","to":"granted","approved":true}',
    '{"type":"Photos","to":"not_set"}',
  ]) {
    const service = new NvidiaDraftService("k", undefined, reply(content));
    await assert.rejects(service.createDraft("do something"), NvidiaDraftUnclearError, content);
  }
});

test("a draft is only a draft: it carries no request id and applies nothing", async () => {
  const service = new NvidiaDraftService("k", undefined, reply('{"type":"School Trips","to":"granted","changeContext":"standard"}'));
  const draft = await service.createDraft("Let my child go on trips");
  assert.deepEqual(Object.keys(draft).sort(), ["changeContext", "summary", "to", "type"]);
});

// ----------------------------------------------------------- key handling

test("the key never appears in errors, even when the transport error echoes it", async () => {
  const key = "nvapi-SECRET-VALUE-999";
  const echoing: typeof fetch = async () => {
    throw new Error(`connect failed, headers: authorization: Bearer ${key}`);
  };
  let message = "";
  try {
    await new NvidiaDraftService(key, undefined, echoing).createDraft("Withdraw Photos");
  } catch (e) {
    assert.ok(e instanceof NvidiaDraftRequestError);
    message = String((e as Error).message) + String((e as Error).stack);
  }
  assert.ok(message.length > 0);
  assert.equal(message.includes(key), false);

  const http500: typeof fetch = async () => new Response(`bad key ${key}`, { status: 401 });
  try {
    await new NvidiaDraftService(key, undefined, http500).createDraft("Withdraw Photos");
    assert.fail("should have thrown");
  } catch (e) {
    assert.equal(String((e as Error).message).includes(key), false);
  }
});

// ----------------------------------------------------- PIN confirmation

test("PIN: right PIN passes, wrong PIN fails, and the hash is not the PIN", () => {
  const pins = new PinService(() => 0);
  pins.setPin("P-001", "0000");
  assert.deepEqual(pins.verify("P-001", "0000"), { ok: true });
  const wrong = pins.verify("P-001", "1111");
  assert.equal(wrong.ok, false);
  assert.equal(pins.verify("P-001", undefined).ok, false);
  assert.equal(pins.verify("P-001", 0000).ok, false);
  assert.equal(pins.verify("P-999", "0000").ok, false); // unknown parent
  assert.throws(() => pins.setPin("P-002", "12"), /PIN/);
});

test("PIN: rate limited, then unlocks after the lock period", () => {
  let now = 0;
  const pins = new PinService(() => now);
  pins.setPin("P-001", "0000");
  let last;
  for (let i = 0; i < MAX_ATTEMPTS; i++) last = pins.verify("P-001", "0000");
  assert.equal(last && !last.ok && last.locked, true);
  // Even the right PIN is refused while locked.
  const locked = pins.verify("P-001", "0000");
  assert.equal(locked.ok, false);
  now += LOCK_MS + 1;
  assert.deepEqual(pins.verify("P-001", "0000"), { ok: true });
});

test("drafts are held server-side: owner only, expiring, single use", () => {
  let now = 0;
  const store = new DraftStore(() => now);
  const draft: ConsentDraft = {
    type: "Photos",
    to: "withdrawn",
    changeContext: "standard",
    summary: "Withdraw Photos consent",
  };
  const id = store.create("P-001", draft);
  assert.deepEqual(store.peek(id, "P-001"), draft);
  assert.equal(store.peek(id, "P-002"), undefined); // another parent
  assert.equal(store.peek("nope", "P-001"), undefined);
  // A wrong PIN peeks but does not consume, so the parent can retry.
  assert.deepEqual(store.peek(id, "P-001"), draft);
  store.consume(id);
  assert.equal(store.peek(id, "P-001"), undefined);

  const id2 = store.create("P-001", draft);
  now += DRAFT_TTL_MS + 1;
  assert.equal(store.peek(id2, "P-001"), undefined);
});