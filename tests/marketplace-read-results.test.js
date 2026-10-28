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
    ancillaryErrors: ["activity", "workflow"]
  });
});

test("empty successful history results remain distinguishable from failures", () => {
  assert.deepEqual(collectAncillaryReadResults(fulfilled([]), fulfilled([])), {
    activityRows: [],
    workflowRows: [],
    pickupAppointmentRows: [],
    traceabilityRows: [],
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
    ancillaryErrors: ["traceability"]
  });
});
