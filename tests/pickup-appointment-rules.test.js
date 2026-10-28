import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDemoPickupAppointment, respondToDemoPickupAppointment, validatePickupSchedule, validateRescheduleRequest } from "../src/lib/pickupAppointmentRules.js";

const now = Date.parse("2026-10-27T12:00:00.000Z");

test("pickup proposals must be valid, more than 30 minutes ahead, and within 90 days", () => {
  assert.equal(validatePickupSchedule("not-a-date", now).reason, "invalid_time");
  assert.equal(validatePickupSchedule("2026-10-27T12:30:00.000Z", now).reason, "too_soon");
  assert.equal(validatePickupSchedule("2027-01-26T12:00:00.001Z", now).reason, "too_far");
  assert.equal(validatePickupSchedule("2026-10-27T12:31:00.000Z", now).ok, true);
});

test("reschedule requests require a useful note and trim whitespace", () => {
  assert.equal(validateRescheduleRequest("  short ").reason, "note_length");
  assert.deepEqual(validateRescheduleRequest("  Need a different pickup window.  "), {
    ok: true,
    note: "Need a different pickup window."
  });
  assert.equal(validateRescheduleRequest("x".repeat(501)).reason, "note_length");
});

test("demo appointment normalization rejects malformed records and bounds rendered text", () => {
  assert.equal(normalizeDemoPickupAppointment({ status: "unexpected", scheduledAt: "2026-10-28T12:00:00Z" }, "lot-1"), null);
  assert.equal(normalizeDemoPickupAppointment({ status: "proposed", scheduledAt: { value: "tomorrow" } }, "lot-1"), null);
  assert.equal(normalizeDemoPickupAppointment(["unexpected"], "lot-1"), null);

  const appointment = normalizeDemoPickupAppointment({
    status: "confirmed",
    scheduledAt: "2026-10-28T12:00:00.000Z",
    respondedBy: "Recycler",
    proposedNote: { userControlledObject: true },
    responseNote: "x".repeat(600)
  }, "lot-1");
  assert.equal(appointment.lotId, "lot-1");
  assert.equal(appointment.proposedNote, "");
  assert.equal(appointment.responseNote.length, 500);
});

test("demo Recycler can confirm or request a new time only for a pending proposal", () => {
  const proposal = { status: "proposed", scheduledAt: "2026-10-28T12:00:00.000Z" };
  const confirmed = respondToDemoPickupAppointment(proposal, "confirm", "", "Demo Recycler", now);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.appointment.status, "confirmed");
  assert.equal(confirmed.appointment.respondedBy, "Demo Recycler");

  const reschedule = respondToDemoPickupAppointment(proposal, "request_reschedule", "That time conflicts with our route.", "Demo Recycler", now);
  assert.equal(reschedule.ok, true);
  assert.equal(reschedule.appointment.status, "reschedule_requested");
  assert.equal(respondToDemoPickupAppointment(confirmed.appointment, "confirm", "", "Demo Recycler", now).reason, "proposal_unavailable");
  assert.equal(respondToDemoPickupAppointment(proposal, "request_reschedule", "no", "Demo Recycler", now).reason, "note_length");
  assert.equal(respondToDemoPickupAppointment({ ...proposal, scheduledAt: "2026-10-27T11:59:59.000Z" }, "confirm", "", "Demo Recycler", now).reason, "time_passed");
});
