const MIN_NOTICE_MS = 30 * 60 * 1000;
const MAX_ADVANCE_MS = 90 * 24 * 60 * 60 * 1000;
const appointmentStatuses = new Set(["proposed", "confirmed", "reschedule_requested"]);

export function normalizeDemoPickupAppointment(value, lotId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!appointmentStatuses.has(value.status) || typeof value.scheduledAt !== "string" || !Number.isFinite(Date.parse(value.scheduledAt))) return null;

  const respondedBy = typeof value.respondedBy === "string" && value.respondedBy.trim()
    ? value.respondedBy.slice(0, 100)
    : null;
  if (value.status === "proposed" && value.respondedBy != null) return null;
  if (value.status !== "proposed" && !respondedBy) return null;

  const text = item => typeof item === "string" ? item.slice(0, 500) : "";
  return {
    id: typeof value.id === "string" && value.id ? value.id.slice(0, 120) : `PA-legacy-${String(lotId).slice(0, 80)}`,
    lotId: typeof lotId === "string" ? lotId : "",
    offerId: typeof value.offerId === "string" ? value.offerId.slice(0, 120) : "",
    scheduledAt: value.scheduledAt,
    status: value.status,
    proposedNote: text(value.proposedNote),
    responseNote: text(value.responseNote),
    proposedBy: typeof value.proposedBy === "string" ? value.proposedBy.slice(0, 100) : "Demo Collector",
    respondedBy
  };
}

export function validatePickupSchedule(scheduledAt, now = Date.now()) {
  const timestamp = typeof scheduledAt === "string" ? Date.parse(scheduledAt) : NaN;
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "invalid_time" };
  if (timestamp <= now + MIN_NOTICE_MS) return { ok: false, reason: "too_soon" };
  if (timestamp > now + MAX_ADVANCE_MS) return { ok: false, reason: "too_far" };
  return { ok: true, timestamp };
}

export function validateRescheduleRequest(note) {
  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (cleanNote.length < 10 || cleanNote.length > 500) {
    return { ok: false, reason: "note_length" };
  }
  return { ok: true, note: cleanNote };
}

export function respondToDemoPickupAppointment(appointment, decision, note, responder, now = Date.now()) {
  if (!appointment || appointment.status !== "proposed") {
    return { ok: false, reason: "proposal_unavailable" };
  }
  if (decision !== "confirm" && decision !== "request_reschedule") {
    return { ok: false, reason: "invalid_decision" };
  }

  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (decision === "request_reschedule") {
    const validation = validateRescheduleRequest(cleanNote);
    if (!validation.ok) return validation;
  } else if (cleanNote.length > 500) {
    return { ok: false, reason: "note_length" };
  } else if (!Number.isFinite(Date.parse(appointment.scheduledAt)) || Date.parse(appointment.scheduledAt) <= now) {
    return { ok: false, reason: "time_passed" };
  }

  return {
    ok: true,
    appointment: {
      ...appointment,
      status: decision === "confirm" ? "confirmed" : "reschedule_requested",
      responseNote: cleanNote,
      respondedBy: responder
    }
  };
}
