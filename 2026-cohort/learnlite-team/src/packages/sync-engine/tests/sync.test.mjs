import test from "node:test";
import assert from "node:assert/strict";
import { createSyncEngine } from "../src/index.mjs";

function setup(fetchFn = async () => {
  throw new Error("Network unavailable");
}) {
  const data = new Map();

  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    }
  };

  const engine = createSyncEngine({
    storage,
    fetchFn,
    getToken: async () => "test-token",
    baseUrl: "https://api.example.test",
    userId: "student-001"
  });

  const operation = {
    operationId: "op-001",
    classroomId: "class-001",
    kind: "lesson_progress",
    targetId: "lesson-001",
    value: "completed",
    baseRevision: 0
  };

  return { engine, operation, storage };
}

test("offline operation is queued", async () => {
  const { engine, operation } = setup();
  await engine.enqueue(operation);
  assert.equal(await engine.pendingCount(), 1);
});

test("duplicate local operation ID is not queued twice", async () => {
  const { engine, operation } = setup();
  await engine.enqueue(operation);
  await engine.enqueue(operation);
  assert.equal(await engine.pendingCount(), 1);
});

test("failed network request retains pending work", async () => {
  const { engine, operation } = setup();
  await engine.enqueue(operation);
  const result = await engine.flush();
  assert.equal(result.pending, 1);
  assert.equal(result.results[0].status, "retry_later");
});

test("successful synchronization removes queued work", async () => {
  const { engine, operation } = setup(async () => ({
    ok: true,
    json: async () => ({
      results: [{
        operationId: "op-001",
        status: "applied",
        revision: 1
      }]
    })
  }));

  await engine.enqueue(operation);
  const result = await engine.flush();
  assert.equal(result.pending, 0);
});

test("server conflict retains pending work", async () => {
  const { engine, operation } = setup(async () => ({
    ok: true,
    json: async () => ({
      results: [{
        operationId: "op-001",
        status: "conflict",
        serverRevision: 2
      }]
    })
  }));

  await engine.enqueue(operation);
  const result = await engine.flush();
  assert.equal(result.pending, 1);
  assert.equal(result.results[0].status, "conflict");
});

test("pulled content remains available offline", async () => {
  let online = true;

  const { engine } = setup(async () => {
    if (!online) throw new Error("Offline");

    return {
      ok: true,
      json: async () => ({
        items: [{ targetId: "lesson-001", value: "completed" }],
        count: 1
      })
    };
  });

  const first = await engine.pull();
  assert.equal(first.source, "server");

  online = false;

  const second = await engine.pull();
  assert.equal(second.source, "cache");
  assert.equal(second.items.length, 1);
});

test("cached and queued data survive engine recreation", async () => {
  const { engine, operation, storage } = setup();
  await engine.enqueue(operation);

  const recreated = createSyncEngine({
    storage,
    fetchFn: async () => { throw new Error("Offline"); },
    getToken: async () => "test-token",
    baseUrl: "https://api.example.test",
    userId: "student-001"
  });

  assert.equal(await recreated.pendingCount(), 1);
});

test("different users have isolated queues", async () => {
  const { engine, operation, storage } = setup();
  await engine.enqueue(operation);

  const other = createSyncEngine({
    storage,
    fetchFn: async () => { throw new Error("Offline"); },
    getToken: async () => "test-token",
    baseUrl: "https://api.example.test",
    userId: "student-002"
  });

  assert.equal(await other.pendingCount(), 0);
});
