/**
 * Wires up the fictional school (Jacaranda Heights Primary) for the MVP:
 * the three simulated systems, the audit log and the connector, seeded with
 * the test data described in the scenarios draft.
 *
 * Esther owns the authoritative test data; this is a buildable starting point.
 */

import { AuditLog } from "./audit/auditLog.js";
import { ConsentConnector } from "./connector/consentConnector.js";
import { PhotoMediaLibrary } from "./systems/photoMediaLibrary.js";
import { TripsEventsRegister } from "./systems/tripsEventsRegister.js";
import { LearnerRecords } from "./systems/learnerRecords.js";

export interface School {
  photoLibrary: PhotoMediaLibrary;
  tripsRegister: TripsEventsRegister;
  learnerRecords: LearnerRecords;
  audit: AuditLog;
  connector: ConsentConnector;
}

/** Build a fresh school with seeded test data and starting consent states. */
export function buildSchool(): School {
  const photoLibrary = new PhotoMediaLibrary();
  const tripsRegister = new TripsEventsRegister();
  const learnerRecords = new LearnerRecords();
  const audit = new AuditLog();

  // Seed test data (fictional, no names).
  photoLibrary.seedPhotos("L-101", 5); // Scenario 1
  learnerRecords.seedRecord("L-103"); // Scenario 3

  const connector = new ConsentConnector(
    [photoLibrary, tripsRegister, learnerRecords],
    audit,
  );

  // Starting consent states per the scenarios.
  connector.setState("L-101", "Photos", "granted");
  connector.setState("L-102", "School Trips", "not_set");
  connector.setState("L-103", "Medical", "granted");

  return { photoLibrary, tripsRegister, learnerRecords, audit, connector };
}
