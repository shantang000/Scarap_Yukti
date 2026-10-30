import assert from "node:assert/strict";
import test from "node:test";
test("recycling evidence helper exports safe upload and review operations", async () => {
  const source = await import("../src/lib/recyclingEvidence.js");
  assert.equal(source.RECYCLING_EVIDENCE_MAX_BYTES, 10 * 1024 * 1024);
  assert.deepEqual([...source.RECYCLING_EVIDENCE_TYPES].sort(), ["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  assert.equal(typeof source.uploadRecyclingEvidence, "function");
  assert.equal(typeof source.reviewRecyclingEvidence, "function");
  assert.equal(typeof source.createRecyclingEvidenceUrl, "function");
});