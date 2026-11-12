import React from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  FileText,
  MapPin,
  Package,
  Recycle,
  Scale,
  ShieldCheck,
  Truck,
  UserCheck,
  Zap
} from "lucide-react";

export function TraceabilityTimeline({
  lot,
  workflowEvents = [],
  pickupAppointment = null,
  role = "Collector"
}) {
  if (!lot) return null;

  const stages = [
    {
      id: "intake",
      key: "Open",
      label: "Upstream Intake",
      sub: "Listing Published",
      icon: <Package size={14} />,
      desc: "Listing published with approximate pickup area and estimated weight (personal contact details hidden).",
      isDone: ["Open", "Offer submitted", "Pickup scheduled", "Collected", "Recycling review", "Recycled", "Disputed"].includes(lot.status),
      isActive: lot.status === "Open"
    },
    {
      id: "offer",
      key: "Offer submitted",
      label: "Offer Decided",
      sub: "Recycler Bid Accepted",
      icon: <Zap size={14} />,
      desc: "A recycler bid has been submitted and accepted by the listing owner.",
      isDone: ["Pickup scheduled", "Collected", "Recycling review", "Recycled"].includes(lot.status),
      isActive: lot.status === "Offer submitted"
    },
    {
      id: "pickup",
      key: "Pickup scheduled",
      label: "Pickup Coordinated",
      sub: "Pickup Time Proposed",
      icon: <Truck size={14} />,
      desc: pickupAppointment
        ? `Appointment: ${pickupAppointment.status.replaceAll("_", " ")} (${pickupAppointment.scheduledAt ? new Date(pickupAppointment.scheduledAt).toLocaleDateString("en-IN") : "Date pending"})`
        : "Owner and accepted recycler agree on a pickup date and time.",
      isDone: ["Collected", "Recycling review", "Recycled"].includes(lot.status),
      isActive: lot.status === "Pickup scheduled"
    },
    {
      id: "collected",
      key: "Collected",
      label: "Custody Handover",
      sub: "Physical Handover",
      icon: <Scale size={14} />,
      desc: lot.actualWeight != null
        ? `Recorded receiving weight: ${lot.actualWeight} kg (self-reported by accepted recycler).`
        : "Material marked collected; awaiting receiving weight entry by accepted recycler.",
      isDone: ["Recycling review", "Recycled"].includes(lot.status),
      isActive: lot.status === "Collected"
    },
    {
      id: "review",
      key: "Recycling review",
      label: "Facility Receiving",
      sub: "Compliance Review",
      icon: <FileText size={14} />,
      desc: lot.evidence
        ? `Review Note: "${lot.evidence}"`
        : "Admin reviews weight match and processing notes before closing lot.",
      isDone: lot.status === "Recycled",
      isActive: lot.status === "Recycling review"
    },
    {
      id: "recycled",
      key: "Recycled",
      label: "Certified Recycled",
      sub: "Workflow Closed",
      icon: <Recycle size={14} />,
      desc: "Marked as recycled in workflow records. Statutory certificates must be issued directly by the authorized recycler.",
      isDone: lot.status === "Recycled",
      isActive: lot.status === "Recycled"
    }
  ];

  const relevantEvents = workflowEvents.filter((ev) => ev.lotId === lot.id);

  return (
    <div className="traceability-timeline-container">
      <div className="timeline-header">
        <div className="timeline-title-group">
          <span className="eyebrow">
            <ShieldCheck size={14} /> CHAIN OF CUSTODY & AUDIT LEDGER
          </span>
          <h4>Lot Traceability Pipeline: {lot.id}</h4>
        </div>
        {lot.status === "Disputed" && (
          <div className="timeline-dispute-badge">
            <AlertTriangle size={15} />
            <span>DISPUTE ACTIVE · CUSTODY FROZEN</span>
          </div>
        )}
      </div>

      <div className="timeline-stepper">
        {stages.map((stage, idx) => {
          let nodeClass = "stepper-node";
          if (stage.isActive) nodeClass += " active";
          else if (stage.isDone) nodeClass += " completed";
          else nodeClass += " upcoming";

          return (
            <div key={stage.id} className={nodeClass}>
              <div className="node-marker-wrap">
                <div className="node-marker">
                  {stage.isDone && !stage.isActive ? <Check size={13} /> : stage.icon}
                </div>
                {idx < stages.length - 1 && (
                  <div className={`node-connector ${stage.isDone ? "done" : ""}`} />
                )}
              </div>
              <div className="node-copy">
                <span className="node-step-label">STAGE 0{idx + 1}</span>
                <strong className="node-title">{stage.label}</strong>
                <span className="node-sub">{stage.sub}</span>
                <p className="node-desc">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* RELEVANT RECORDED AUDIT EVENTS */}
      {relevantEvents.length > 0 && (
        <div className="timeline-audit-ledger">
          <div className="audit-ledger-header">
            <Clock size={13} />
            <span>RECORDED WORKFLOW EVENTS ({relevantEvents.length})</span>
          </div>
          <div className="audit-ledger-list">
            {relevantEvents.map((ev, i) => (
              <div key={ev.id || i} className="audit-ledger-row">
                <div className="audit-time">
                  {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Timestamp unavailable"}
                </div>
                <div className="audit-event-type">
                  <code>{ev.eventType || "status_change"}</code>
                </div>
                <div className="audit-transition">
                  <span className="audit-from">{ev.fromStatus || "—"}</span>
                  <span className="audit-arrow">→</span>
                  <span className="audit-to">{ev.toStatus}</span>
                </div>
                {ev.note && <div className="audit-note">{ev.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

