/**
 * Runnable walkthrough of the three request scenarios.
 * Run with: npm run demo
 */

import { buildSchool } from "./school.js";
import type { HistoryStep } from "./history/completionHistory.js";
import type { ChangeResult } from "./connector/consentConnector.js";
import type { AuditLog } from "./audit/auditLog.js";

function printHistory(title: string, steps: readonly HistoryStep[]): void {
  console.log(`\n=== ${title} ===`);
  for (const step of steps) {
    const mark =
      step.status === "complete"
        ? "[x]"
        : step.status === "rejected"
          ? "[rejected]"
          : step.status === "failed"
            ? "[!]"
            : "[ ]";
    console.log(`  ${mark} ${step.label}${step.detail ? ` — ${step.detail}` : ""}`);
  }
}

function printEvidence(
  result: ChangeResult,
  audit: AuditLog,
): void {
  console.log("  impact map:");
  if (result.history.impactMap().length === 0) {
    console.log("    no system updates (approval is still pending)");
  }
  for (const entry of result.history.impactMap()) {
    console.log(
      `    ${entry.system}: ${entry.status}${entry.detail ? ` — ${entry.detail}` : ""}`,
    );
  }

  const requestEvents = audit.entries().filter((entry) =>
    result.request.auditEntryIndexes.includes(entry.index),
  );
  console.log("  audit log:");
  for (const entry of requestEvents) {
    const verification = entry.details.verificationMethod
      ? ` | verification: ${entry.details.verificationMethod}`
      : "";
    const staff = entry.details.staffId
      ? ` | staff: ${entry.details.staffId}`
      : "";
    console.log(
      `    #${entry.index} ${entry.timestamp} ${entry.event}${verification}${staff} | hash: ${entry.hash.slice(0, 12)}…`,
    );
  }
  console.log(`  audit chain intact: ${JSON.stringify(audit.verify())}`);
}

// Scenario 1: Parent withdraws Photos consent (no approval).
{
  const school = buildSchool();
  const result = school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });
  printHistory("Scenario 1: Withdraw Photos", result.history.listSteps());
  console.log(`  status: ${result.status} | ${result.impactSummary.text}`);
  printEvidence(result, school.audit);
}

// Scenario 2: Parent grants School Trips consent (S-01 approves).
{
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-002",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-102",
      type: "School Trips",
      from: "not_set",
      to: "granted",
    },
    { staffId: "S-01", approved: true },
  );
  printHistory("Scenario 2: Grant School Trips", result.history.listSteps());
  console.log(`  status: ${result.status} | ${result.impactSummary.text}`);
  printEvidence(result, school.audit);
}

// Scenario 3: Parent withdraws Medical consent (S-02 approves).
{
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-003",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-103",
      type: "Medical",
      from: "granted",
      to: "withdrawn",
    },
    { staffId: "S-02", approved: true },
  );
  printHistory("Scenario 3: Withdraw Medical", result.history.listSteps());
  console.log(`  status: ${result.status} | ${result.impactSummary.text}`);
  printEvidence(result, school.audit);
  console.log(`  full audit chain verification: ${JSON.stringify(school.audit.verify())}`);
}
