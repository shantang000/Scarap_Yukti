import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  Layers,
  Lock,
  Package,
  Play,
  Pause,
  Recycle,
  Scale,
  ShieldCheck,
  Truck,
  Zap
} from "lucide-react";
import { CircularFlowCanvas } from "./CircularFlowCanvas.jsx";

const JOURNEY_STAGES = [
  {
    id: "seller",
    step: "01",
    title: "Seller Lists E-Waste",
    roleName: "Seller / Business Generator",
    roleKey: "Seller",
    badge: "STEP 01 · LISTING",
    icon: <Package size={20} className="text-lime" />,
    headline: "List surplus electronics without exposing your personal contact details",
    narrative:
      "Offices, factories, and households post e-waste listings with category, approximate area, and estimated weight. Automatic privacy filters block phone numbers, emails, and exact house numbers until an offer is accepted.",
    equipment: "Approximate area listing · Automatic contact filter",
    statutoryRule: "Supports responsible e-waste segregation for IT & battery scrap.",
    telemetry: {
      "Sample Batch": "Retired Office Laptops (24 units)",
      "Declared Weight": "48.0 kg",
      "Public Area": "DLF Phase 2, Gurugram",
      "Privacy Status": "Contact Hidden Until Accepted"
    },
    demoCta: "Open Seller Demo"
  },
  {
    id: "collection",
    step: "02",
    title: "Collector Pickup & Staging",
    roleName: "Local Collector / Aggregator",
    roleKey: "Collector",
    badge: "STEP 02 · PICKUP",
    icon: <Truck size={20} className="text-lime" />,
    headline: "Claim nearby seller batches and plan consolidated pickups",
    narrative:
      "Collectors review available seller batches in the demo feed, propose a pickup date, and stage collected work into aggregated consignment lots. On-site weighing and transport coordination happen offline.",
    equipment: "Batch consolidation · Scheduled pickup window",
    statutoryRule: "Structured aggregator handovers reduce informal scrap loss.",
    telemetry: {
      "Sample Batch": "Server Enclosures & Copper Busbars",
      "Declared Weight": "92.5 kg",
      "Pickup Window": "Proposed & Agreed in App",
      "Verification Note": "Physical weighing handled on-site"
    },
    demoCta: "Open Collector Demo"
  },
  {
    id: "aggregation",
    step: "03",
    title: "Bulk Consignment Bidding",
    roleName: "Collector → Recycler",
    roleKey: "Collector",
    badge: "STEP 03 · OFFERS",
    icon: <Layers size={20} className="text-lime" />,
    headline: "Compare transparent buyer bids under fair 1-bid-per-recycler rules",
    narrative:
      "Participating recyclers browse open lots by category and area, then submit a single competitive offer per lot. Accepting one offer automatically declines other pending bids and opens pickup scheduling.",
    equipment: "1-offer-per-recycler limit · Side-by-side bid comparison",
    statutoryRule: "Prevents duplicate spam offers and post-acceptance edits.",
    telemetry: {
      "Sample Consignment": "Server Motherboards & RAM",
      "Declared Weight": "85.0 kg",
      "Offer Status": "2 Competing Bids Compared",
      "Payment Terms": "Settled directly between parties"
    },
    demoCta: "Inspect Consignments"
  },
  {
    id: "recycler",
    step: "04",
    title: "Receiving Weight Check",
    roleName: "Recycler Facility",
    roleKey: "Recycler",
    badge: "STEP 04 · INTAKE",
    icon: <Scale size={20} className="text-lime" />,
    headline: "Record receiving net weight and spot major weight discrepancies",
    narrative:
      "Once collection is recorded, the accepted recycler enters the measured receiving weight. If receiving weight differs significantly from the declared weight (>10%), the lot is highlighted for compliance review.",
    equipment: "Receiving weight entry · Discrepancy % check",
    statutoryRule: "Highlights abnormal weight loss between pickup and facility.",
    telemetry: {
      "Sample Receiving": "Industrial Display Monitors",
      "Receiving Weight": "64.2 kg entered",
      "Weight Difference": "-1.23% vs declared",
      "Audit Status": "Logged in Workflow History"
    },
    demoCta: "Open Recycler Demo"
  },
  {
    id: "traceability",
    step: "05",
    title: "Compliance Review & Archive",
    roleName: "Operations Admin",
    roleKey: "Admin",
    badge: "STEP 05 · AUDIT",
    icon: <ShieldCheck size={20} className="text-lime" />,
    headline: "Review processing notes, resolve disputes, and close the loop",
    narrative:
      "Operations admins review weight discrepancies, hold disputed lots while investigating issues, require documented processing notes before completion, and export workspace records to CSV.",
    equipment: "Dispute holds · Required processing review notes",
    statutoryRule: "Form-6 statutory certificates must still be issued directly by recyclers.",
    telemetry: {
      "Workflow Steps": "6 Tracked Custody Milestones",
      "Dispute Controls": "Hold & Resume Arbitration",
      "Data Export": "Clean CSV Spreadsheet",
      "Current State": "Recycled (Workflow Complete)"
    },
    demoCta: "Open Admin Demo"
  }
];

export function PhysicalJourneyNarrative({ onLaunchDemo }) {
  const [activeStageId, setActiveStageId] = useState("seller");
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStage = JOURNEY_STAGES.find((s) => s.id === activeStageId) || JOURNEY_STAGES[0];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStageId((prevId) => {
        const currentIndex = JOURNEY_STAGES.findIndex((s) => s.id === prevId);
        const nextIndex = (currentIndex + 1) % JOURNEY_STAGES.length;
        return JOURNEY_STAGES[nextIndex].id;
      });
    }, 4200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="landing-section physical-journey-section" id="journey">
      <div className="section-header">
        <div className="section-eyebrow-row">
          <span className="section-eyebrow">
            <Recycle size={15} /> HOW MATERIAL MOVES
          </span>
          <div className="journey-autoplay-controls">
            <button
              type="button"
              className={`journey-play-btn ${isPlaying ? "active" : ""}`}
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause step walkthrough" : "Auto-advance step walkthrough"}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? "Pause Walkthrough" : "Autoplay Steps"}</span>
            </button>
          </div>
        </div>

        <h2>Step-by-Step Custody Walkthrough</h2>
        <p>
          Follow how an e-waste batch moves from initial listing to facility intake, weight comparison, and compliance closure.
        </p>
      </div>

      {/* INTERACTIVE STAGE CANVAS */}
      <div className="journey-canvas-wrap">
        <CircularFlowCanvas
          activeStageId={activeStageId}
          onSelectStage={(id) => {
            setActiveStageId(id);
            setIsPlaying(false);
          }}
        />
      </div>

      {/* STAGE SELECTOR TABS */}
      <div className="journey-stage-selector" role="tablist" aria-label="E-Waste Journey Stages">
        {JOURNEY_STAGES.map((stage) => {
          const isActive = stage.id === activeStageId;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`journey-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => {
                setActiveStageId(stage.id);
                setIsPlaying(false);
              }}
            >
              <div className="tab-step-indicator">{stage.step}</div>
              <div className="tab-text-wrap">
                <strong>{stage.title}</strong>
                <span>{stage.roleName}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* INTERACTIVE STAGE DEEP-DIVE CARD */}
      <div className="journey-stage-detail-card" key={currentStage.id}>
        <div className="detail-card-main">
          <div className="detail-card-header">
            <div className="detail-badge-group">
              <span className="journey-badge">{currentStage.badge}</span>
              <span className="journey-role-pill">
                {currentStage.icon} {currentStage.roleName}
              </span>
            </div>
            <h3>{currentStage.headline}</h3>
          </div>

          <p className="detail-narrative-copy">{currentStage.narrative}</p>

          <div className="detail-statutory-box">
            <div className="statutory-item">
              <ShieldCheck size={16} className="text-lime" />
              <div>
                <strong>Operational Safeguard:</strong>
                <span>{currentStage.statutoryRule}</span>
              </div>
            </div>
            <div className="statutory-item">
              <Scale size={16} className="text-cyan" />
              <div>
                <strong>Stage Controls:</strong>
                <span>{currentStage.equipment}</span>
              </div>
            </div>
          </div>

          <div className="detail-cta-row">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => onLaunchDemo(currentStage.roleKey)}
            >
              <Zap size={14} />
              <span>{currentStage.demoCta}</span>
              <ChevronRight size={14} />
            </button>
            <span className="cta-helper-text">Opens isolated browser demo with sample records</span>
          </div>
        </div>

        {/* ILLUSTRATIVE RECORD SUMMARY PANE */}
        <div className="detail-card-telemetry">
          <div className="telemetry-header">
            <span className="live-pulse-dot" />
            <strong>SAMPLE STAGE EXAMPLE</strong>
          </div>

          <div className="telemetry-grid">
            {Object.entries(currentStage.telemetry).map(([key, val]) => (
              <div key={key} className="telemetry-item">
                <span className="telemetry-label">{key}</span>
                <span className="telemetry-value">{val}</span>
              </div>
            ))}
          </div>

          <div className="telemetry-foot">
            <Lock size={12} />
            <span>Illustrative workflow example (no real hardware scale connected)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
