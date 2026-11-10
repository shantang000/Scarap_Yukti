import { supabase } from "./supabase.js";
import { validateListingPrivacy } from "./privacyRules.js";

// Helpers for marketplace lot mutations, traceability, and workflow governance.
function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function updateLotDetails(lotId, { title, category, weight, location, notes = "", currentStatus }) {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanCategory = typeof category === "string" ? category.trim() : "";
  const cleanLocation = typeof location === "string" ? location.trim() : "";
  const cleanNotes = typeof notes === "string" ? notes.trim() : "";
  const numWeight = Number(weight);

  if (currentStatus && currentStatus !== "open" && currentStatus !== "Open") {
    throw new Error("Lots can only be edited while in open status. Revisions are locked once bids exist or the workflow advances.");
  }

  if (cleanTitle.length < 2 || cleanTitle.length > 100) {
    throw new Error("Lot name must be between 2 and 100 characters.");
  }
  if (!Number.isFinite(numWeight) || numWeight < 0.1 || numWeight > 100000) {
    throw new Error("Enter a weight from 0.1 to 100,000 kg.");
  }
  if (!cleanCategory || cleanCategory.length > 80) {
    throw new Error("Choose a category with no more than 80 characters.");
  }
  if (cleanLocation.length < 2 || cleanLocation.length > 160) {
    throw new Error("Pickup location must be between 2 and 160 characters.");
  }
  if (cleanNotes.length > 500) {
    throw new Error("Notes must be 500 characters or fewer.");
  }

  const privacyCheck = validateListingPrivacy({ title: cleanTitle, location: cleanLocation, notes: cleanNotes });
  if (!privacyCheck.ok) {
    throw new Error(privacyCheck.reason);
  }

  const { error } = await requireClient()
    .from("lots")
    .update({
      title: cleanTitle,
      category: cleanCategory,
      weight_kg: numWeight,
      location: cleanLocation,
      notes: cleanNotes
    })
    .eq("id", lotId)
    .eq("status", "open");

  if (error) {
    if (error.code === "42501") {
      throw new Error("Database policy denied this edit. You can only edit lots that you own while they remain in open status.");
    }
    throw error;
  }
}

export async function recordHandoverWeight(lotId, actualWeightKg) {
  const weight = Number(actualWeightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100000) {
    throw new Error("Enter an actual weight between 0.1 and 100,000 kg.");
  }
  const { error } = await requireClient().rpc("record_handover_weight", {
    p_lot_id: lotId,
    p_actual_weight_kg: weight,
  });
  if (error) throw error;
}

export async function raiseDispute(lotId, note) {
  const clean = typeof note === "string" ? note.trim() : "";
  if (clean.length < 10 || clean.length > 500) {
    throw new Error("Dispute note must be between 10 and 500 characters.");
  }
  const { error } = await requireClient().rpc("raise_dispute", {
    p_lot_id: lotId,
    p_note: clean,
  });
  if (error) throw error;
}
