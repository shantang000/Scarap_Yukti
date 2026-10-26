import { supabase } from "./supabase.js";
import { collectAncillaryReadResults } from "./marketplaceReadResults.js";

const statusLabels = {
  open: "Open",
  offer_submitted: "Offer submitted",
  pickup_scheduled: "Pickup scheduled",
  collected: "Collected",
  recycling_review: "Recycling review",
  recycled: "Recycled",
  disputed: "Disputed"
};

function displayStatus(status) {
  return statusLabels[status] || String(status || "Unknown");
}

function displayTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function displayDate(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

export async function loadMarketplaceSnapshot() {
  if (!supabase) throw new Error("Supabase is not configured. Add the project URL and publishable key to .env.local.");

  const [lotsResult, offersResult, ancillaryResults] = await Promise.all([
    supabase
      .from("lots")
      .select("id, collector_id, title, category, weight_kg, actual_weight_kg, weight_discrepancy_pct, location, notes, status, evidence_note, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select("id, lot_id, recycler_id, amount, message, status, created_at")
      .order("created_at", { ascending: false }),
    Promise.allSettled([
      supabase
        .from("activity_history")
        .select("id, lot_id, actor_id, event_type, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("workflow_events")
        .select("id, lot_id, actor_id, from_status, to_status, event_type, note, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    ])
  ]);

  const failedQuery = [lotsResult, offersResult].find(result => result.error);
  if (failedQuery) throw failedQuery.error;
  if (!Array.isArray(lotsResult.data) || !Array.isArray(offersResult.data)) {
    throw new Error("Could not load marketplace data: the database returned an invalid lots or offers response.");
  }

  const { activityRows, workflowRows, ancillaryErrors } = collectAncillaryReadResults(...ancillaryResults);

  const lotRows = lotsResult.data || [];
  const offerRows = offersResult.data || [];
  const profileIds = [...new Set([
    ...lotRows.map(lot => lot.collector_id),
    ...offerRows.map(offer => offer.recycler_id)
  ].filter(Boolean))];

  let profileRows = [];
  for (let offset = 0; offset < profileIds.length; offset += 500) {
    const batch = profileIds.slice(offset, offset + 500);
    const { data, error } = await supabase.rpc("visible_marketplace_profile_names", {
      p_profile_ids: batch
    });
    if (error) {
      throw new Error(`Could not load marketplace participant names: ${error.message}`);
    }
    if (!Array.isArray(data)) {
      throw new Error("Could not load marketplace participant names: the database returned an invalid response.");
    }
    profileRows.push(...data);
  }

  const namesById = new Map(profileRows.map(profile => [profile.id, profile.display_name || "Marketplace user"]));
  const offersByLot = new Map();
  for (const offer of offerRows) {
    const lotOffers = offersByLot.get(offer.lot_id) || [];
    lotOffers.push({
      id: offer.id,
      lotId: offer.lot_id,
      recyclerId: offer.recycler_id,
      recycler: namesById.get(offer.recycler_id) || "Recycler",
      price: Number(offer.amount),
      message: offer.message || "",
      status: offer.status,
      createdAt: offer.created_at
    });
    offersByLot.set(offer.lot_id, lotOffers);
  }

  const lots = lotRows.map(lot => ({
    id: lot.id,
    collectorId: lot.collector_id,
    collector: namesById.get(lot.collector_id) || "Collector",
    title: lot.title,
    category: lot.category,
    weight: Number(lot.weight_kg),
    actualWeight: lot.actual_weight_kg == null ? null : Number(lot.actual_weight_kg),
    discrepancyPct: lot.weight_discrepancy_pct == null ? null : Number(lot.weight_discrepancy_pct),
    location: lot.location,
    date: displayDate(lot.created_at),
    status: displayStatus(lot.status),
    notes: lot.notes || "",
    evidence: lot.evidence_note || "",
    offers: offersByLot.get(lot.id) || []
  }));

  const activity = activityRows.map(item => ({
    id: item.id,
    text: item.summary,
    time: displayTime(item.created_at),
    lotId: item.lot_id,
    eventType: item.event_type
  }));

  const workflowEvents = workflowRows.map(item => ({
    id: item.id,
    lotId: item.lot_id,
    actorId: item.actor_id,
    fromStatus: item.from_status ? displayStatus(item.from_status) : "",
    toStatus: displayStatus(item.to_status),
    eventType: item.event_type,
    note: item.note || "",
    time: displayTime(item.created_at)
  }));

  return { lots, activity, workflowEvents, ancillaryErrors };
}
