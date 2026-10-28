import assert from "node:assert/strict";
import test from "node:test";
import { getTraceabilityActionState } from "../src/lib/traceabilityView.js";

test("accepted Recycler actions appear only when traceability reads are available", () => {
  const lot = { status: "Collected", actualWeight: null };
  assert.deepEqual(getTraceabilityActionState(lot, "recycler", true), {
    canWeigh: true,
    canDispute: true,
    awaitingTraceability: false
  });
});

test("missing traceability schema or read access shows an unavailable state, not actionable controls", () => {
  const lot = { status: "Collected", actualWeight: null };
  assert.deepEqual(getTraceabilityActionState(lot, "recycler", false), {
    canWeigh: false,
    canDispute: false,
    awaitingTraceability: true
  });
});

test("weight cannot be recorded twice and Admin monitoring never exposes participant actions", () => {
  const recorded = { status: "Collected", actualWeight: 12.5 };
  assert.deepEqual(getTraceabilityActionState(recorded, "recycler", true), {
    canWeigh: false,
    canDispute: true,
    awaitingTraceability: false
  });
  assert.deepEqual(getTraceabilityActionState(recorded, "info", true), {
    canWeigh: false,
    canDispute: false,
    awaitingTraceability: false
  });
});

test("disputes are offered only in the migration's participant-allowed statuses", () => {
  for (const status of ["Pickup scheduled", "Collected", "Recycling review"]) {
    assert.equal(getTraceabilityActionState({ status }, "collector", true).canDispute, true);
  }
  for (const status of ["Open", "Offer submitted", "Recycled", "Disputed"]) {
    assert.equal(getTraceabilityActionState({ status }, "collector", true).canDispute, false);
  }
});
