const DISPUTE_FROM = new Set(["Pickup scheduled", "Collected", "Recycling review"]);

export function getTraceabilityActionState(lot, mode, available) {
  const hasWeight = lot?.actualWeight != null;
  const isOwner = mode === "collector" || mode === "seller";
  const canWeigh = Boolean(available && mode === "recycler" && lot?.status === "Collected" && !hasWeight);
  const canDispute = Boolean(available && (mode === "recycler" || isOwner) && DISPUTE_FROM.has(lot?.status));
  const awaitingTraceability = Boolean(!available && (
    (mode === "recycler" && lot?.status === "Collected" && !hasWeight)
    || ((mode === "recycler" || isOwner) && DISPUTE_FROM.has(lot?.status))
  ));

  return { canWeigh, canDispute, awaitingTraceability };
}
