import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildSchool } from "./school.js";
import type { ChangeResult } from "./connector/consentConnector.js";

const dashboardHtml = readFileSync(new URL("./dashboard.html", import.meta.url));

function sendJson(
  response: ServerResponse,
  statusCode: number,
  value: unknown,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function sendMethodNotAllowed(response: ServerResponse): void {
  sendJson(response, 405, { error: "Method not allowed" });
}

export function createDashboardServer() {
  let school = buildSchool();
  let verified = false;
  let latestChange: ChangeResult | undefined;

  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (url.pathname === "/" && request.method === "GET") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy":
          "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
      });
      response.end(dashboardHtml);
      return;
    }

    if (url.pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, {
        parentId: "P-001",
        learnerId: "L-101",
        verified,
        consentState: school.connector.getState("L-101", "Photos"),
        photos: school.photoLibrary.photosFor("L-101"),
        history: latestChange?.history.listSteps() ?? [],
        impactMap: latestChange?.history.impactMap() ?? [],
        impactSummary: latestChange?.impactSummary.text ?? "No request submitted",
        auditEntries: school.audit.entries(),
        auditVerification: school.audit.verify(),
      });
      return;
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      verified = true;
      sendJson(response, 200, {
        verified,
        message: "Demo parent P-001 is marked verified for this local session.",
      });
      return;
    }

    if (url.pathname === "/api/withdraw-photos" && request.method === "POST") {
      if (!verified) {
        sendJson(response, 401, {
          error: "Verify the demo parent before changing consent.",
        });
        return;
      }

      const currentState = school.connector.getState("L-101", "Photos");
      if (currentState !== "granted") {
        sendJson(response, 409, {
          error: `Photos consent is already ${currentState}. Reset the demo to run Scenario 1 again.`,
        });
        return;
      }

      latestChange = school.connector.process({
        parentId: "P-001",
        parentVerified: true,
        verificationMethod: "separate_pin",
        learnerId: "L-101",
        type: "Photos",
        from: currentState,
        to: "withdrawn",
      });
      sendJson(response, 200, {
        status: latestChange.status,
        request: latestChange.request,
        history: latestChange.history.listSteps(),
        impactMap: latestChange.history.impactMap(),
        impactSummary: latestChange.impactSummary,
        photos: school.photoLibrary.photosFor("L-101"),
        auditEntries: school.audit.entries(),
        auditVerification: school.audit.verify(),
      });
      return;
    }

    if (url.pathname === "/api/reset" && request.method === "POST") {
      school = buildSchool();
      verified = false;
      latestChange = undefined;
      sendJson(response, 200, { message: "Demo reset to the Scenario 1 starting state." });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "API route not found" });
      return;
    }
    if (url.pathname === "/" && request.method !== "GET") {
      sendMethodNotAllowed(response);
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT ?? "4173");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const server = createDashboardServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`ConsentKey Scenario 1 dashboard: http://127.0.0.1:${port}`);
    console.log("Demo-only: uses fictional data and simulated parent verification.");
  });
}
