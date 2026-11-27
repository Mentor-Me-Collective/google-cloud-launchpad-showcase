import assert from "node:assert/strict";
import { test } from "node:test";
import { createDashboardServer } from "../src/dashboard.js";

interface DashboardState {
  consentState: string;
  photos: { blocked: boolean }[];
  verified: boolean;
}

interface DashboardChange {
  status: string;
  request: { currentState: string; verificationMethod: string };
  impactSummary: { text: string };
  impactMap: { system: string; status: string }[];
  photos: { blocked: boolean }[];
  auditVerification: { ok: boolean };
}

test("Scenario 1 dashboard verifies demo parent and withdraws Photos end to end", async (t) => {
  const server = createDashboardServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Your consent settings/);

  const initialResponse = await fetch(`${baseUrl}/api/state`);
  const initial = (await initialResponse.json()) as DashboardState;
  assert.equal(initial.consentState, "granted");
  assert.equal(initial.photos.length, 5);
  assert.equal(initial.verified, false);

  const unverifiedResponse = await fetch(`${baseUrl}/api/withdraw-photos`, {
    method: "POST",
  });
  assert.equal(unverifiedResponse.status, 401);

  await fetch(`${baseUrl}/api/verify`, { method: "POST" });
  const changeResponse = await fetch(`${baseUrl}/api/withdraw-photos`, {
    method: "POST",
  });
  assert.equal(changeResponse.status, 200);
  const change = (await changeResponse.json()) as DashboardChange;
  assert.equal(change.status, "complete");
  assert.equal(change.request.currentState, "withdrawn");
  assert.equal(change.request.verificationMethod, "separate_pin");
  assert.equal(change.impactSummary.text, "1 of 1 system(s) updated");
  const photoImpact = change.impactMap[0];
  assert.ok(photoImpact);
  assert.equal(photoImpact.system, "Photo and Media Library");
  assert.equal(photoImpact.status, "updated");
  assert.ok(change.photos.every((photo: { blocked: boolean }) => photo.blocked));
  assert.deepEqual(change.auditVerification, { ok: true });

  const repeatedResponse = await fetch(`${baseUrl}/api/withdraw-photos`, {
    method: "POST",
  });
  assert.equal(repeatedResponse.status, 409);

  await fetch(`${baseUrl}/api/reset`, { method: "POST" });
  const resetResponse = await fetch(`${baseUrl}/api/state`);
  const reset = (await resetResponse.json()) as DashboardState;
  assert.equal(reset.verified, false);
  assert.equal(reset.consentState, "granted");
  assert.ok(reset.photos.every((photo: { blocked: boolean }) => !photo.blocked));
});
