import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  Layers,
  Lock,
  Package,
  Play,
  Pause,
  Recycle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Zap
} from "lucide-react";
import { CircularFlowCanvas } from "./CircularFlowCanvas.jsx";

const JOURNEY_STAGES = [
  {
    id: "seller",
    step: "01",
    title: "Upstream Listing & PII Shielding",
    roleName: "Enterprise / SMB Seller",
    roleKey: "Seller",
    badge: "STAGE 01 · GENERATOR",
    icon: <Package size={20} className="text-lime" />,
    headline: "Surplus Asset Declaration with Zero Off-Platform Leaks",
    narrative:
      "A commercial generator or household lists obsolete IT equipment, telecom servers, or battery scrap with estimated gross weights and municipal zones. PostgreSQL triggers scrub 10-digit Indian mobile numbers, emails, and residential addresses to eliminate gray-market diversion.",
    equipment: "Physical inventory audit, PII regex trigger",
    statutoryRule: "E-Waste Rules (2022) Rule 4: Responsibilities of the manufacturer & bulk consumer.",
    telemetry: {
      "Asset Batch": "Retired Telecom Server Racks (42U)",
      "Estimated Mass": "84.5 kg",
      "Corridor Zone": "Okhla Phase-3, South Delhi",
      "Privacy Guard": "100% Sanitized (Zero PII)"
    },
    demoCta: "Inspect Seller Experience"
  },
  {
    id: "collection",
    step: "02",
    title: "On-Site Weighing & OTP Custody Handover",
    roleName: "Verified Aggregator / Collector",
    roleKey: "Collector",
    badge: "STAGE 02 · LOGISTICS",
    icon: <Truck size={20} className="text-lime" />,
    headline: "Tamper-Evident Physical Handover at Generator Site",
    narrative:
      "The authorized Collector arrives at the pickup site equipped with an industrial portable platform scale. A one-time 6-digit secure handover token is exchanged on-site before the vehicle is loaded, transferring verified custody to the aggregator.",
    equipment: "Portable industrial platform scale, Secure OTP exchange",
    statutoryRule: "E-Waste Rules (2022) Rule 5: Extended Producer Responsibility (EPR) transportation protocols.",
    telemetry: {
      "Gross Weight": "84.50 kg",
      "Tare Weight": "0.00 kg (Dedicated Container)",
      "Net Weight": "84.50 kg verified",
      "Custody OTP": "Token Verified · Match Confirmed"
    },
    demoCta: "Inspect Collector Intake"
  },
  {
    id: "aggregation",
    step: "03",
    title: "Consignment Bundling & Bidding",
    roleName: "Consolidation Hub",
    roleKey: "Collector",
    badge: "STAGE 03 · AGGREGATION",
    icon: <Layers size={20} className="text-lime" />,
    headline: "Stream Consolidation into High-Density Truckloads",
    narrative:
      "The Aggregator combines multiple discrete collected batches into categorized industrial consignment lots. Registered dismantlers and recyclers submit binding commercial bids under a strict one-bid-per-recycler policy, preventing market front-running.",
    equipment: "Hub consolidation storage, batch consignment tagging",
    statutoryRule: "Central Pollution Control Board (CPCB) Guidelines for Storage & Segregation.",
    telemetry: {
      "Consignment ID": "CON-2026-DEL-04",
      "Aggregated Batches": "3 Generator Lots Combined",
      "Total Consignment Mass": "236.5 kg",
      "Commercial Status": "3 Bids Under Review"
    },
    demoCta: "Inspect Consignments"
  },
  {
    id: "recycler",
    step: "04",
    title: "Weighbridge Intake & Variance Audit",
    roleName: "Authorized Smelter / Recycler",
    roleKey: "Recycler",
    badge: "STAGE 04 · REFINING",
    icon: <Scale size={20} className="text-lime" />,
    headline: "Certified Facility Weighbridge Intake & Mass-Balance Check",
    narrative:
      "The truck arrives at the licensed recycling and smelting facility. Gross and tare weights are measured on a certified weighbridge. Actual net weight is checked against category discrepancy tolerance thresholds; within-tolerance variances update the mass balance automatically.",
    equipment: "Industrial axle weighbridge (reference margin ±0.05%), Moisture analyzer",
    statutoryRule: "Schedule I allowable variance criteria & SPCB Consent to Operate (CTO).",
    telemetry: {
      "Facility Intake": "Indo-German Smelting Facility",
      "Weighbridge Net": "237.20 kg",
      "Variance vs Declared": "+0.29% (Admissible)",
      "Discrepancy Status": "TOLERANCE COMPLIANT · PROCESSED"
    },
    demoCta: "Inspect Recycler Weighbridge"
  },
  {
    id: "traceability",
    step: "05",
    title: "Closed-Loop Governance & Event Ledger",
    roleName: "Compliance Officer / Admin",
    roleKey: "Admin",
    badge: "STAGE 05 · AUDIT",
    icon: <ShieldCheck size={20} className="text-lime" />,
    headline: "Append-Only Chain-of-Custody Audit Log for Anti-Diversion",
    narrative:
      "Every transition from generator declaration through weighbridge intake and recycling review is logged chronologically in an append-only event audit log. Regulatory bodies and participants inspect complete custody history with dispute arbitration and discrepancy tracking.",
    equipment: "PostgreSQL Row-Level Security, Security-Definer RPC audit ledger",
    statutoryRule: "E-Waste Rules (2022) Rule 13: Mass balance auditing and verification.",
    telemetry: {
      "Audit Trail": "6 Chronological Workflow Milestones",
      "Dispute Status": "Zero Active Disputes",
      "Custody Chain": "Closed Loop Completed",
      "Governance Status": "Certified Recycled (Workflow Status)"
    },
    demoCta: "Inspect Compliance Ledger"
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
            <Recycle size={15} /> PHYSICAL MATERIAL INTEGRITY
          </span>
          <div className="journey-autoplay-controls">
            <button
              type="button"
              className={`journey-play-btn ${isPlaying ? "active" : ""}`}
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause journey autoplay" : "Play journey walkthrough"}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? "Autoplay Active" : "Play Custody Walkthrough"}</span>
            </button>
          </div>
        </div>

        <h2>Physical E-Waste Custody Circuit</h2>
        <p>
          Trace an industrial electronics batch from commercial retirement through certified intake weighing, consignment aggregation, and smelter refining.
        </p>
      </div>

      {/* 60FPS CIRCUIT CANVAS */}
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
                <strong>Regulatory Reference Context:</strong>
                <span>{currentStage.statutoryRule}</span>
              </div>
            </div>
            <div className="statutory-item">
              <Scale size={16} className="text-cyan" />
              <div>
                <strong>Physical Instrumentation:</strong>
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
            <span className="cta-helper-text">Opens isolated demo dashboard with pre-loaded mock records</span>
          </div>
        </div>

        {/* TELEMETRY TELEGRAPH PANE */}
        <div className="detail-card-telemetry">
          <div className="telemetry-header">
            <span className="live-pulse-dot" />
            <strong>SIMULATED FIELD TELEMETRY</strong>
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
            <span>Verified & logged to Postgres audit trigger</span>
          </div>
        </div>
      </div>
    </section>
  );
}
