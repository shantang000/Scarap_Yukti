import { supabase } from "./supabase.js";

// Helpers for the 20261027000000_traceability_hardening migration.
// Not wired into the UI yet; apply the migration before calling these.
function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function recordHandoverWeight(lotId, actualWeightKg) {
  const weight = Number(actualWeightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100000) {
    throw new Error("Enter an actual weight from 0.1 to 100,000 kg.");
  }
  const { error } = await requireClient().rpc("record_handover_weight", {
    p_lot_id: lotId,
    p_actual_weight_kg: weight
  });
  if (error) throw error;
}

export async function raiseDispute(lotId, note) {
  const clean = typeof note === "string" ? note.trim() : "";
  if (clean.length < 10 || clean.length > 500) {
    throw new Error("Dispute note must be between 10 and 500 characters.");
  }
  const { error } = await requireClient().rpc("raise_dispute", { p_lot_id: lotId, p_note: clean });
  if (error) throw error;
}
