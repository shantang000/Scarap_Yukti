function rowsFromSettledResult(result, source, errors) {
  if (!result || result.status === "rejected") {
    errors.push(source);
    return [];
  }

  const queryResult = result.value;
  if (!queryResult || queryResult.error || !Array.isArray(queryResult.data)) {
    errors.push(source);
    return [];
  }

  return queryResult.data;
}

// History is useful context, but a history read failure must not hide lots/offers.
export function collectAncillaryReadResults(activityResult, workflowResult, pickupAppointmentsResult, traceabilityResult, recyclingEvidenceResult) {
  const errors = [];
  const activityRows = rowsFromSettledResult(activityResult, "activity", errors);
  const workflowRows = rowsFromSettledResult(workflowResult, "workflow", errors);
  const pickupAppointmentRows = pickupAppointmentsResult === undefined
    ? []
    : rowsFromSettledResult(pickupAppointmentsResult, "pickup_appointments", errors);
  const traceabilityRows = traceabilityResult === undefined
    ? []
    : rowsFromSettledResult(traceabilityResult, "traceability", errors);
  const recyclingEvidenceRows = recyclingEvidenceResult === undefined
    ? []
    : rowsFromSettledResult(recyclingEvidenceResult, "recycling_evidence", errors);

  return {
    activityRows,
    workflowRows,
    pickupAppointmentRows,
    traceabilityRows,
    recyclingEvidenceRows,
    ancillaryErrors: errors
  };
}
