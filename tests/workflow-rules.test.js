import assert from "node:assert/strict";
import test from "node:test";
import { allowedDemoTransitions, applyDemoWorkflowTransition, decideDemoOffer } from "../src/lib/workflowRules.js";

function sampleLot(overrides = {}) {
  return {
    id: "lot-1",
    status: "Offer submitted",
    evidence: "",
    offers: [
      { id: "offer-1", status: "pending", price: 120 },
      { id: "offer-2", status: "pending", price: 100 },
      { id: "offer-3", status: "rejected", price: 90 }
    ],
    ...overrides
  };
}

test("accepting a pending offer accepts it and rejects other pending offers", () => {
  const lot = sampleLot();
  const result = decideDemoOffer(lot, "offer-1", "accepted");

  assert.equal(result.ok, true);
  assert.equal(result.lot.status, "Pickup scheduled");
  assert.deepEqual(result.lot.offers.map(offer => offer.status), ["accepted", "rejected", "rejected"]);
  assert.equal(lot.status, "Offer submitted", "the input lot remains unchanged");
  assert.deepEqual(lot.offers.map(offer => offer.status), ["pending", "pending", "rejected"]);
});

test("rejecting an offer keeps the lot open to offers while another is pending", () => {
  const result = decideDemoOffer(sampleLot(), "offer-1", "rejected");

  assert.equal(result.ok, true);
  assert.equal(result.lot.status, "Offer submitted");
  assert.deepEqual(result.lot.offers.map(offer => offer.status), ["rejected", "pending", "rejected"]);
});

test("rejecting the last pending offer reopens the lot", () => {
  const lot = sampleLot({ offers: [{ id: "offer-1", status: "pending" }] });
  const result = decideDemoOffer(lot, "offer-1", "rejected");

  assert.equal(result.ok, true);
  assert.equal(result.lot.status, "Open");
  assert.equal(result.lot.offers[0].status, "rejected");
});

test("offer decisions reject missing lots, missing or settled offers, closed lots, and invalid decisions", () => {
  assert.deepEqual(decideDemoOffer(null, "offer-1", "accepted"), { ok: false, reason: "lot_unavailable" });
  assert.equal(decideDemoOffer(sampleLot(), "missing", "accepted").reason, "offer_unavailable");
  assert.equal(decideDemoOffer(sampleLot(), "offer-3", "accepted").reason, "offer_not_pending");
  assert.equal(decideDemoOffer(sampleLot({ status: "Collected" }), "offer-1", "accepted").reason, "lot_not_accepting_offers");
  assert.equal(decideDemoOffer(sampleLot(), "offer-1", "cancelled").reason, "invalid_decision");
});

test("the demo workflow permits the existing sequential transitions only", () => {
  assert.deepEqual(allowedDemoTransitions["Pickup scheduled"], ["Collected"]);
  assert.deepEqual(allowedDemoTransitions.Collected, ["Recycling review"]);
  assert.deepEqual(allowedDemoTransitions["Recycling review"], ["Recycled"]);
  assert.deepEqual(allowedDemoTransitions.Recycled, []);
  assert.equal(applyDemoWorkflowTransition(sampleLot({ status: "Open" }), "Recycled").reason, "invalid_transition");
  assert.equal(applyDemoWorkflowTransition(sampleLot({ status: "Open" }), "Open").reason, "unchanged");
});

test("collection can be recorded after pickup coordination without changing status names", () => {
  const result = applyDemoWorkflowTransition(sampleLot({ status: "Pickup scheduled" }), "Collected");

  assert.equal(result.ok, true);
  assert.equal(result.lot.status, "Collected");
  assert.equal(result.lot.evidence, "");
});

test("recycling review trims and saves a note only when its length is 10 through 500", () => {
  const validNote = `  ${"e".repeat(10)}  `;
  const result = applyDemoWorkflowTransition(sampleLot({ status: "Collected" }), "Recycling review", validNote);
  assert.equal(result.ok, true);
  assert.equal(result.lot.evidence, "e".repeat(10));
  assert.equal(result.evidenceSaved, true);

  const maxLengthResult = applyDemoWorkflowTransition(
    sampleLot({ status: "Collected" }),
    "Recycling review",
    "x".repeat(500)
  );
  assert.equal(maxLengthResult.ok, true);
  assert.equal(maxLengthResult.lot.evidence.length, 500);
});

test("recycling review rejects notes shorter than 10, longer than 500, or blank after trimming", () => {
  for (const note of ["short", "x".repeat(501), "          "]) {
    assert.equal(
      applyDemoWorkflowTransition(sampleLot({ status: "Collected" }), "Recycling review", note).reason,
      "evidence_note_length"
    );
  }
});

test("recycled status requires saved evidence, and stored evidence is preserved", () => {
  assert.equal(
    applyDemoWorkflowTransition(sampleLot({ status: "Recycling review", evidence: "  " }), "Recycled").reason,
    "evidence_required"
  );
  const lot = sampleLot({ status: "Recycling review", evidence: "Checked by Admin" });
  const result = applyDemoWorkflowTransition(lot, "Recycled");
  assert.equal(result.ok, true);
  assert.equal(result.lot.status, "Recycled");
  assert.equal(result.lot.evidence, "Checked by Admin");
});

test("invalid input objects fail safely instead of throwing", () => {
  assert.equal(decideDemoOffer({ status: "Offer submitted", offers: null }, "offer-1", "accepted").reason, "lot_unavailable");
  assert.equal(applyDemoWorkflowTransition(null, "Collected").reason, "lot_unavailable");
  assert.equal(
    applyDemoWorkflowTransition(sampleLot({ status: "Collected" }), "Recycling review", null).reason,
    "evidence_note_length"
  );
});
