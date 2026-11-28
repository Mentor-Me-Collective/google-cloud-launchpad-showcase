import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NvidiaDraftConfigurationError,
  NvidiaDraftService,
  NvidiaDraftUnclearError,
} from "../src/ai/nvidiaDraftService.js";

test("NVIDIA draft service requires a server-side API key", async () => {
  const service = new NvidiaDraftService(undefined);
  await assert.rejects(
    service.createDraft("Withdraw Photos consent"),
    NvidiaDraftConfigurationError,
  );
});

test("NVIDIA response is validated as a consent draft", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const service = new NvidiaDraftService(
    "test-api-key",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"type":"Photos","to":"withdrawn","changeContext":"standard","summary":"Withdraw photo consent"}',
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  );

  const draft = await service.createDraft("Withdraw Photos consent");
  assert.equal(draft.type, "Photos");
  assert.equal(draft.to, "withdrawn");
  assert.equal(requestUrl, "https://integrate.api.nvidia.com/v1/chat/completions");
  assert.equal(
    new Headers(requestInit?.headers).get("authorization"),
    "Bearer test-api-key",
  );
});

test("NVIDIA response with unsupported consent values is rejected", async () => {
  const service = new NvidiaDraftService(
    "test-api-key",
    undefined,
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"type":"Banking","to":"withdrawn","changeContext":"standard","summary":"Change"}',
              },
            },
          ],
        }),
        { status: 200 },
      ),
  );

  // Invalid output is rejected and the parent is asked to clarify.
  await assert.rejects(
    service.createDraft("Change a consent"),
    NvidiaDraftUnclearError,
  );
});
