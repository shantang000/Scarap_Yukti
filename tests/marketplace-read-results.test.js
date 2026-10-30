import assert from "node:assert/strict";
import test from "node:test";
import { collectAncillaryReadResults } from "../src/lib/marketplaceReadResults.js";

function fulfilled(data, error = null) {
  return { status: "fulfilled", value: { data, error } };
}

test("ancillary history results retain rows when both queries succeed", () => {
  const activity = [{ id: 1 }];
  const workflow = [{ id: 2 }];

  assert.deepEqual(collectAncillaryReadResults(fulfilled(activity), fulfilled(workflow)), {
    activityRows: activity,
    workflowRows: workflow,
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: []
  });
});

test("one history query failure is reported without discarding the other history rows", () => {
  const workflow = [{ id: 2 }];
  const result = collectAncillaryReadResults(
    { status: "rejected", reason: new Error("network failure") },
    fulfilled(workflow)
  );

  assert.deepEqual(result, {
    activityRows: [],
    workflowRows: workflow,
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: ["activity"]
  });
});

test("query errors and malformed ancillary responses are not treated as successful empty results", () => {
  const result = collectAncillaryReadResults(
    fulfilled(null, new Error("permission denied")),
    fulfilled("not-an-array")
  );

  assert.deepEqual(result, {
    activityRows: [],
    workflowRows: [],
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: ["activity", "workflow"]
  });
});

test("empty successful history results remain distinguishable from failures", () => {
  assert.deepEqual(collectAncillaryReadResults(fulfilled([]), fulfilled([])), {
    activityRows: [],
    workflowRows: [],
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: []
  });
});

test("pickup appointment read failures are reported separately from successful history rows", () => {
  const activity = [{ id: 1 }];
  const appointmentFailure = { status: "rejected", reason: new Error("table unavailable") };
  assert.deepEqual(collectAncillaryReadResults(fulfilled(activity), fulfilled([]), appointmentFailure), {
    activityRows: activity,
    workflowRows: [],
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: ["pickup_appointments"]
  });
});

test("traceability-column failures remain ancillary to the core lot read", () => {
  const traceabilityFailure = { status: "rejected", reason: new Error("column unavailable") };
  assert.deepEqual(collectAncillaryReadResults(fulfilled([]), fulfilled([]), fulfilled([]), traceabilityFailure), {
    activityRows: [],
    workflowRows: [],
    pickupAppointmentRows: [],
    traceabilityRows: [],
    recyclingEvidenceRows: [],
    ancillaryErrors: ["traceability"]
  });
});

test("recycling evidence rows are retained as an ancillary result", () => {
  const evidence = [{ id: "evidence-1", lot_id: "lot-1", review_status: "pending" }];
  const result = collectAncillaryReadResults(
    fulfilled([]),
    fulfilled([]),
    fulfilled([]),
    fulfilled([]),
    fulfilled(evidence)
  );
  assert.deepEqual(result.recyclingEvidenceRows, evidence);
  assert.deepEqual(result.ancillaryErrors, []);
});

test("recycling evidence read failures are reported without discarding core history rows", () => {
  const activity = [{ id: 1 }];
  const evidenceFailure = { status: "rejected", reason: new Error("permission denied") };
  const result = collectAncillaryReadResults(
    fulfilled(activity),
    fulfilled([]),
    fulfilled([]),
    fulfilled([]),
    evidenceFailure
  );
  assert.deepEqual(result.activityRows, activity);
  assert.deepEqual(result.recyclingEvidenceRows, []);
  assert.deepEqual(result.ancillaryErrors, ["recycling_evidence"]);
});
