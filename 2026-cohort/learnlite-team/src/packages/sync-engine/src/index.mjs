/**
 * LearnLite offline-first sync engine.
 *
 * storage must expose getItem(key) and setItem(key, string).
 * Compatible with AsyncStorage-style persistent adapters.
 */

export function createSyncEngine({
  storage,
  fetchFn,
  getToken,
  baseUrl,
  userId
}) {
  if (!storage?.getItem || !storage?.setItem) {
    throw new Error("Persistent storage adapter required");
  }
  if (typeof fetchFn !== "function") {
    throw new Error("fetchFn required");
  }
  if (typeof getToken !== "function") {
    throw new Error("getToken required");
  }
  if (!baseUrl || !userId) {
    throw new Error("baseUrl and userId required");
  }

  const prefix = `learnlite:v1:${userId}`;
  const queueKey = `${prefix}:queue`;
  const cacheKey = `${prefix}:cache`;

  async function read(key, fallback) {
    const value = await storage.getItem(key);
    return value === null || value === undefined
      ? fallback
      : JSON.parse(value);
  }

  async function write(key, value) {
    await storage.setItem(key, JSON.stringify(value));
  }

  async function queue() {
    return read(queueKey, []);
  }

  async function enqueue(operation) {
    const required = [
      "operationId",
      "classroomId",
      "kind",
      "targetId",
      "value"
    ];

    for (const field of required) {
      if (typeof operation[field] !== "string" || !operation[field]) {
        throw new Error(`Missing or invalid ${field}`);
      }
    }

    if (!["lesson_progress", "assignment_draft"].includes(operation.kind)) {
      throw new Error("Unsupported operation kind");
    }

    const items = await queue();
    const previous = items.find(
      item => item.operationId === operation.operationId
    );

    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify({
        ...operation,
        baseRevision: operation.baseRevision ?? 0
      })) {
        throw new Error("Operation ID already used");
      }
      return items.length;
    }

    items.push({
      ...operation,
      baseRevision: operation.baseRevision ?? 0
    });

    await write(queueKey, items);
    return items.length;
  }

  async function authorizedFetch(path, options = {}) {
    const token = await getToken();
    if (!token) throw new Error("Authentication required");

    return fetchFn(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  }

  async function flush() {
    const pending = await queue();
    const remaining = [];
    const results = [];
    let stopped = false;

    for (let i = 0; i < pending.length; i++) {
      const operation = pending[i];

      if (stopped) {
        remaining.push(operation);
        continue;
      }

      try {
        const response = await authorizedFetch("/api/v1/sync/push", {
          method: "POST",
          body: JSON.stringify({ operations: [operation] })
        });

        if (!response.ok) {
          remaining.push(operation);
          stopped = true;
          results.push({
            operationId: operation.operationId,
            status: "http_error",
            httpStatus: response.status
          });
          continue;
        }

        const body = await response.json();
        const result = body.results?.[0];

        if (!result || result.operationId !== operation.operationId) {
          throw new Error("Unexpected synchronization response");
        }

        results.push(result);

        if (!["applied", "duplicate"].includes(result.status)) {
          remaining.push(operation);
          if (result.status === "conflict" ||
              result.status === "operation_id_conflict") {
            stopped = true;
          }
        }
      } catch (error) {
        remaining.push(operation);
        stopped = true;
        results.push({
          operationId: operation.operationId,
          status: "retry_later",
          message: String(error.message || error)
        });
      }
    }

    await write(queueKey, remaining);

    return {
      pending: remaining.length,
      results
    };
  }

  async function pull() {
    try {
      const response = await authorizedFetch("/api/v1/sync/pull");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      await write(cacheKey, {
        ...data,
        cachedAt: new Date().toISOString()
      });

      return {
        source: "server",
        ...data
      };
    } catch (error) {
      const cached = await read(cacheKey, null);

      if (cached) {
        return {
          source: "cache",
          ...cached
        };
      }

      return {
        source: "offline",
        items: [],
        count: 0,
        error: String(error.message || error)
      };
    }
  }

  return {
    enqueue,
    queue,
    flush,
    pull,
    getCachedData: () => read(cacheKey, null),
    pendingCount: async () => (await queue()).length
  };
}
