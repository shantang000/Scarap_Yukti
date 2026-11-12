/**
 * Plain-language workflow guidance helper for workspace detail inspectors.
 * Communicates current status, responsible party, and honest next expectations
 * without fabricating unimplemented pickup guarantees or payments.
 */
export function getLotNextStepGuidance(lot, pickupAppointment = null, role = "Seller") {
  if (!lot) return null;
  const offers = Array.isArray(lot.offers) ? lot.offers : [];
  const pendingOffers = offers.filter((o) => o.status === "pending");
  const acceptedOffer = offers.find((o) => o.status === "accepted");

  switch (lot.status) {
    case "Open":
      return {
        responsible: "Registered Recyclers",
        summary: "Open for buyer offers",
        nextStep:
          role === "Recycler"
            ? "Review hardware notes and submit a unit offer if the material matches your facility."
            : "Your listing is visible to registered recyclers. Wait for incoming offers, or edit details while it remains open."
      };
    case "Offer submitted":
      return {
        responsible: role === "Recycler" ? "Listing Owner" : "You (Owner action needed)",
        summary: `${pendingOffers.length} pending ${pendingOffers.length === 1 ? "offer" : "offers"} awaiting review`,
        nextStep:
          role === "Recycler"
            ? "Wait for the Seller/Collector to accept or reject pending offers."
            : "Compare offered amounts and notes below. Accepting one offer automatically declines other pending bids and opens pickup scheduling."
      };
    case "Pickup scheduled": {
      if (!pickupAppointment) {
        return {
          responsible: role === "Recycler" ? "Listing Owner" : "You (Propose pickup time)",
          summary: "Offer accepted — pickup time not proposed yet",
          nextStep:
            role === "Recycler"
              ? `Offer from ${acceptedOffer?.recycler || "buyer"} was accepted. Wait for the listing owner to propose a pickup date and time.`
              : "Propose a pickup date and time below so the accepted recycler can confirm availability."
        };
      }
      if (pickupAppointment.status === "proposed") {
        return {
          responsible: role === "Recycler" ? "You (Confirm or reschedule)" : "Accepted Recycler",
          summary: "Pickup time proposed — awaiting recycler confirmation",
          nextStep:
            role === "Recycler"
              ? "Confirm the proposed time or request a different pickup window."
              : "The recycler must confirm your proposed time before pickup coordination is agreed."
        };
      }
      if (pickupAppointment.status === "reschedule_requested") {
        return {
          responsible: role === "Recycler" ? "Listing Owner" : "You (Propose new time)",
          summary: "Recycler requested another pickup window",
          nextStep:
            role === "Recycler"
              ? "Wait for the listing owner to propose an updated pickup time."
              : "Review the recycler's reschedule note and propose a revised pickup date and time."
        };
      }
      return {
        responsible: "Physical Pickup / Admin Handover",
        summary: "Pickup time agreed — awaiting physical collection",
        nextStep:
          "Coordinate actual vehicle loading off-platform. Note: Online tracking does not dispatch transport or process payments."
      };
    }
    case "Collected":
      return {
        responsible: lot.actualWeight != null ? "Compliance Admin" : "Accepted Recycler",
        summary:
          lot.actualWeight != null
            ? `Collection recorded · Receiving weight ${lot.actualWeight} kg entered`
            : "Handed over — awaiting receiving weight entry",
        nextStep:
          lot.actualWeight != null
            ? "An Admin reviews receiving weight and processing notes before advancing to recycling review."
            : "The accepted recycler records the net weight measured at facility intake."
      };
    case "Recycling review":
      return {
        responsible: "Compliance Admin",
        summary: "Processing note under compliance review",
        nextStep:
          "An Admin checks the processing note and weight match before marking this lot recycled. Any discrepancy can be flagged for review."
      };
    case "Recycled":
      return {
        responsible: "Completed",
        summary: "Workflow marked recycled",
        nextStep:
          "Custody log is closed. Formal EPR or Form-6 statutory certificates must be obtained directly from your authorized recycler."
      };
    case "Disputed":
      return {
        responsible: "Compliance Admin",
        summary: "Workflow paused — under review",
        nextStep:
          "Actions are frozen while an Admin reviews the dispute note and physical weight discrepancy."
      };
    default:
      return {
        responsible: "Marketplace Participants",
        summary: lot.status,
        nextStep: "Check workflow history for details."
      };
  }
}
