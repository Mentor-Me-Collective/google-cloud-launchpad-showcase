# LearnLite Offline Sync Engine — Phase 6

A framework-independent JavaScript synchronization engine.

## Features
- Local action queue
- AsyncStorage-compatible persistent storage adapter
- Retry after network failures
- Server-side idempotency handling
- Revision-conflict reporting
- User-scoped local keys
- Cached synchronized learning progress

## Integration with Expo

The frontend team must supply:
- A durable storage implementation, such as AsyncStorage
- The current Firebase ID token through `getToken`
- The correct staging API URL
- The authenticated Firebase UID
- A network connectivity listener to call `flush()`
- A UI to display pending sync operations and conflicts

Example:

```js
import { createSyncEngine } from "./src/index.mjs";

const sync = createSyncEngine({
  storage: yourPersistentStorage,
  fetchFn: fetch,
  getToken: async () => currentFirebaseIdToken,
  baseUrl: yourBackendUrl,
  userId: currentFirebaseUid
});

await sync.enqueue({
  operationId: uniqueOperationId,
  classroomId: classroomId,
  kind: "lesson_progress",
  targetId: lessonId,
  value: "completed",
  baseRevision: 0
});

await sync.flush();
```

## Limitations
- No mobile app is included in this directory yet.
- The caller must generate unique operation IDs.
- Conflict resolution requires user/application intervention.
- Offline final assignment submission is not implemented.
- Pull currently depends on the backend's first 100 records.
- Lesson content downloading and local content storage remain frontend tasks.
- Authentication tokens must not be stored in this queue.
- This MVP needs concurrency hardening and durable-storage integration tests.

## Testing

```bash
node --test packages/sync-engine/tests/*.test.mjs
```
