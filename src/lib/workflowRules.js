export const allowedDemoTransitions = Object.freeze({
  Open: ["Offer submitted"],
  "Offer submitted": ["Open", "Pickup scheduled"],
  "Pickup scheduled": ["Collected"],
  Collected: ["Recycling review"],
  "Recycling review": ["Recycled"],
  Recycled: [],
  Disputed: []
});

export function decideDemoOffer(lot, offerId, decision) {
  if (!lot || !Array.isArray(lot.offers) || lot.offers.some(offer => !offer || typeof offer !== "object")) {
    return { ok: false, reason: "lot_unavailable" };
  }
  if (decision !== "accepted" && decision !== "rejected") {
    return { ok: false, reason: "invalid_decision" };
  }
  if (lot.status !== "Offer submitted") return { ok: false, reason: "lot_not_accepting_offers" };

  const selectedOffer = lot.offers.find(offer => offer.id === offerId);
  if (!selectedOffer) return { ok: false, reason: "offer_unavailable" };
  if (selectedOffer.status !== "pending") return { ok: false, reason: "offer_not_pending" };

  if (decision === "accepted") {
    return {
      ok: true,
      lot: {
        ...lot,
        status: "Pickup scheduled",
        offers: lot.offers.map(offer => ({
          ...offer,
          status: offer.id === offerId ? "accepted" : offer.status === "pending" ? "rejected" : offer.status
        }))
      }
    };
  }

  const offers = lot.offers.map(offer => offer.id === offerId ? { ...offer, status: "rejected" } : offer);
  const hasPendingOffers = offers.some(offer => offer.status === "pending");
  return {
    ok: true,
    lot: { ...lot, status: hasPendingOffers ? "Offer submitted" : "Open", offers }
  };
}

export function applyDemoWorkflowTransition(lot, nextStatus, note = "") {
  if (!lot) return { ok: false, reason: "lot_unavailable" };
  if (lot.status === nextStatus) return { ok: false, reason: "unchanged" };
  const transitions = Object.hasOwn(allowedDemoTransitions, lot.status)
    ? allowedDemoTransitions[lot.status]
    : null;
  if (!Array.isArray(transitions) || !transitions.includes(nextStatus)) {
    return { ok: false, reason: "invalid_transition" };
  }

  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (nextStatus === "Recycling review" && (cleanNote.length < 10 || cleanNote.length > 500)) {
    return { ok: false, reason: "evidence_note_length" };
  }

  const savedEvidence = typeof lot.evidence === "string" ? lot.evidence.trim() : "";
  if (nextStatus === "Recycled" && savedEvidence.length < 10) {
    return { ok: false, reason: "evidence_required" };
  }

  return {
    ok: true,
    lot: {
      ...lot,
      status: nextStatus,
      ...(nextStatus === "Recycling review" ? { evidence: cleanNote } : {})
    },
    evidenceSaved: nextStatus === "Recycling review"
  };
}
