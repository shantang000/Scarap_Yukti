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
    ancillaryErrors: ["activity", "workflow"]
  });
});

test("empty successful history results remain distinguishable from failures", () => {
  assert.deepEqual(collectAncillaryReadResults(fulfilled([]), fulfilled([])), {
    activityRows: [],
    workflowRows: [],
    ancillaryErrors: []
  });
});
