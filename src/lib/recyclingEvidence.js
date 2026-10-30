import { supabase } from "./supabase.js";

export const RECYCLING_EVIDENCE_BUCKET = "recycling-evidence";
export const RECYCLING_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const RECYCLING_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function validateEvidenceFile(file) {
  if (!file || typeof file !== "object") throw new Error("Choose a photo or PDF first.");
  if (!RECYCLING_EVIDENCE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG, WebP image, or PDF document.");
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > RECYCLING_EVIDENCE_MAX_BYTES) throw new Error("Evidence files must be between 1 byte and 10 MB.");
}

function safeFileName(name) {
  const cleaned = String(name || "evidence").normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return cleaned || "evidence";
}

export async function uploadRecyclingEvidence({ lotId, userId, file, description = "" }) {
  validateEvidenceFile(file);
  const note = typeof description === "string" ? description.trim() : "";
  if (note.length > 500) throw new Error("Description must be 500 characters or fewer.");
  if (!lotId || !userId) throw new Error("A signed-in accepted Recycler account is required.");
  const client = requireClient();
  const path = lotId + "/" + userId + "/" + crypto.randomUUID() + "-" + safeFileName(file.name);
  const { error: uploadError } = await client.storage.from(RECYCLING_EVIDENCE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from("recycling_evidence").insert({
    lot_id: lotId, submitted_by: userId, storage_path: path,
    file_name: String(file.name || "evidence").slice(0, 255),
    content_type: file.type, file_size_bytes: file.size, description: note
  }).select("id").single();
  if (error) { await client.storage.from(RECYCLING_EVIDENCE_BUCKET).remove([path]); throw error; }
  return data;
}

export async function reviewRecyclingEvidence(evidenceId, decision, note = "") {
  if (!evidenceId || !["approved", "rejected"].includes(decision)) throw new Error("Choose a valid evidence record and review decision.");
  const clean = typeof note === "string" ? note.trim() : "";
  if (clean.length > 500 || (decision === "rejected" && clean.length < 10)) throw new Error(decision === "rejected" ? "Explain the rejection in 10 to 500 characters." : "Review note must be 500 characters or fewer.");
  const { error } = await requireClient().rpc("review_recycling_evidence", { p_evidence_id: evidenceId, p_decision: decision, p_note: clean });
  if (error) throw error;
}

export async function createRecyclingEvidenceUrl(storagePath) {
  if (!storagePath || typeof storagePath !== "string") throw new Error("Evidence file path is missing.");
  const { data, error } = await requireClient().storage.from(RECYCLING_EVIDENCE_BUCKET).createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}