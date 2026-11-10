import React from "react";
import { Package } from "lucide-react";

export const statusOptions = [
  "Open",
  "Offer submitted",
  "Pickup scheduled",
  "Collected",
  "Recycling review",
  "Recycled",
  "Disputed"
];

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const shortDate = (d) => {
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export function statusLabel(status) {
  return status === "Pickup scheduled" ? "Accepted - coordinate pickup" : status;
}

export function StatusPill({ status }) {
  const cls = (status || "").toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`status-pill ${cls}`}>
      <span />
      {statusLabel(status)}
    </span>
  );
}

export function OfferStatusPill({ status }) {
  const labels = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };
  return (
    <span className={`offer-status ${status}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}

export function ProgressTrack({ status }) {
  const stages = ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review", "Recycled"];
  const index = stages.indexOf(status);
  return (
    <div className="progress-track" aria-label={`Workflow status: ${statusLabel(status)}`}>
      {stages.map((stage, i) => (
        <span
          className={i <= index ? "done" : ""}
          key={stage}
          title={statusLabel(stage)}
        />
      ))}
    </div>
  );
}

export function LotHeading({ lot }) {
  return (
    <div className="workflow-heading">
      <div className="lot-title">
        <div className="lot-icon">
          <Package size={17} />
        </div>
        <div>
          <strong>{lot.title}</strong>
          <span>
            {lot.id} · {lot.category} · Added {shortDate(lot.date)}
          </span>
        </div>
      </div>
      <StatusPill status={lot.status} />
    </div>
  );
}

export function EmptyState({ title, detail, action, compact = false }) {
  return (
    <div className={`empty-state role-empty ${compact ? "compact" : ""}`}>
      <Package size={25} />
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  );
}

