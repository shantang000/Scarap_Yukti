import React, { useState } from "react";
import {
  Package,
  Scale,
  Clock,
  Truck,
  CheckCircle2,
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function OperationalSummary({ lots = [], role = "Collector" }) {
  const [showCharts, setShowCharts] = useState(true);

  const totalLots = lots.length;
  const totalMass = lots.reduce((acc, l) => acc + (Number(l.weight) || 0), 0);
  const pendingLots = lots.filter((l) => ["Open", "Offer submitted"].includes(l.status)).length;
  const activeLogistics = lots.filter((l) =>
    ["Pickup scheduled", "Collected", "Recycling review"].includes(l.status)
  ).length;
  const recycledLots = lots.filter((l) => l.status === "Recycled").length;
  const disputedLots = lots.filter((l) => l.status === "Disputed").length;
  const pendingOffers = lots.reduce(
    (acc, l) => acc + (l.offers ? l.offers.filter((o) => o.status === "pending").length : 0),
    0
  );

  const getMetrics = () => {
    if (role === "Seller") {
      return [
        {
          label: "Active Listings",
          value: lots.filter((l) => l.status !== "Recycled").length,
          detail: `Total listed: ${totalLots}`,
          icon: <Package size={15} />,
          tone: "teal"
        },
        {
          label: "Listed Scrap Mass",
          value: `${totalMass.toLocaleString("en-IN")} kg`,
          detail: "Declared net scrap",
          icon: <Scale size={15} />,
          tone: "blue"
        },
        {
          label: "Bids to Review",
          value: pendingOffers,
          detail: `${pendingLots} lots open/bidding`,
          icon: <Clock size={15} />,
          tone: "amber"
        },
        {
          label: "Handover & Logistics",
          value: activeLogistics,
          detail: "Accepted & in progress",
          icon: <Truck size={15} />,
          tone: "purple"
        },
        {
          label: "Disposed & Recycled",
          value: recycledLots,
          detail: "Verified disposal",
          icon: <CheckCircle2 size={15} />,
          tone: "teal"
        }
      ];
    }

    if (role === "Collector") {
      return [
        {
          label: "Consignments Managed",
          value: totalLots,
          detail: `${lots.filter((l) => l.status !== "Recycled").length} active batches`,
          icon: <Package size={15} />,
          tone: "teal"
        },
        {
          label: "Aggregated Net Mass",
          value: `${totalMass.toLocaleString("en-IN")} kg`,
          detail: "Consolidated volume",
          icon: <Scale size={15} />,
          tone: "blue"
        },
        {
          label: "Offers Under Review",
          value: pendingOffers,
          detail: "Awaiting your decision",
          icon: <Clock size={15} />,
          tone: "amber"
        },
        {
          label: "Logistics & In Review",
          value: activeLogistics,
          detail: "Pickup / transit active",
          icon: <Truck size={15} />,
          tone: "purple"
        },
        {
          label: "Downstream Recycled",
          value: recycledLots,
          detail: "Verified processed",
          icon: <CheckCircle2 size={15} />,
          tone: "teal"
        }
      ];
    }

    if (role === "Recycler") {
      return [
        {
          label: "Available Lots",
          value: totalLots,
          detail: "Open for bids",
          icon: <Package size={15} />,
          tone: "teal"
        },
        {
          label: "Available Material",
          value: `${totalMass.toLocaleString("en-IN")} kg`,
          detail: "Estimated scrap weight",
          icon: <Scale size={15} />,
          tone: "blue"
        },
        {
          label: "Bidding Open",
          value: pendingLots,
          detail: "Ready for offers",
          icon: <Clock size={15} />,
          tone: "amber"
        },
        {
          label: "Logistics Pipeline",
          value: activeLogistics,
          detail: "In coordination/transit",
          icon: <Truck size={15} />,
          tone: "purple"
        },
        {
          label: "Certified Recycled",
          value: recycledLots,
          detail: "Processed downstream",
          icon: <CheckCircle2 size={15} />,
          tone: "teal"
        }
      ];
    }

    // Default / Admin
    return [
      {
        label: "Marketplace Lots",
        value: totalLots,
        detail: "Across network",
        icon: <Package size={15} />,
        tone: "teal"
      },
      {
        label: "Network Mass",
        value: `${totalMass.toLocaleString("en-IN")} kg`,
        detail: "Audited materials",
        icon: <Scale size={15} />,
        tone: "blue"
      },
      {
        label: "Active Negotiations",
        value: pendingLots,
        detail: "Bidding in progress",
        icon: <Clock size={15} />,
        tone: "amber"
      },
      {
        label: "Custody & In Review",
        value: activeLogistics,
        detail: "Logistics / verification",
        icon: <Truck size={15} />,
        tone: "purple"
      },
      {
        label: "Verified Recycled",
        value: recycledLots,
        detail: "Certified closure",
        icon: <CheckCircle2 size={15} />,
        tone: "teal"
      }
    ];
  };

  const metrics = getMetrics();

  // Category mass distribution for SVG chart
  const categoryMap = {};
  lots.forEach((lot) => {
    const cat = lot.category || "Other";
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(lot.weight) || 0);
  });

  const categories = Object.keys(categoryMap).sort(
    (a, b) => categoryMap[b] - categoryMap[a]
  );
  const maxCategoryMass = Math.max(...Object.values(categoryMap), 1);

  // Status segmentation for Donut chart
  const statusSegments = [
    { label: "Open / Bidding", count: pendingLots, color: "#a3e635" },
    { label: "Logistics / In Review", count: activeLogistics, color: "#38bdf8" },
    { label: "Certified Recycled", count: recycledLots, color: "#34d399" },
    { label: "Disputed", count: disputedLots, color: "#f59e0b" }
  ].filter((s) => s.count > 0);

  // Circumference calculation for SVG Donut (radius 36 => circumference ~226.2)
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="operational-summary-container">
      {/* 5 CORE OPERATIONAL METRIC CARDS */}
      <div className="operational-summary-bar" role="region" aria-label="Operational Summary">
        {metrics.map((item, idx) => (
          <div className="op-metric" key={idx}>
            <div className="op-metric-top">
              <span className="op-metric-label">{item.label}</span>
              <span className={`op-metric-icon ${item.tone}`}>{item.icon}</span>
            </div>
            <div className="op-metric-value">{item.value}</div>
            <div className="op-metric-detail">{item.detail}</div>
          </div>
        ))}
      </div>

      {/* SVG TELEMETRY CHARTS SECTION */}
      <div className="op-charts-collapsible">
        <div className="op-charts-header">
          <div className="op-charts-title">
            <BarChart3 size={15} className="text-lime" />
            <strong>Physical Mass & Pipeline Telemetry</strong>
            <span className="charts-count-tag">{totalLots} lots · {totalMass.toLocaleString("en-IN")} kg</span>
          </div>
          <button
            type="button"
            className="charts-toggle-btn"
            onClick={() => setShowCharts(!showCharts)}
            aria-expanded={showCharts}
          >
            {showCharts ? <><span>Hide Telemetry</span> <ChevronUp size={14} /></> : <><span>View Telemetry</span> <ChevronDown size={14} /></>}
          </button>
        </div>

        {showCharts && (
          <div className="op-charts-grid">
            {/* 1. CATEGORY MASS DISTRIBUTION (GENUINE SVG BAR CHART) */}
            <div className="op-chart-card">
              <div className="chart-card-heading">
                <span className="chart-badge">SCHEDULE I STREAMS</span>
                <h4>Mass Distribution by Material Category</h4>
              </div>

              {categories.length > 0 ? (
                <div className="chart-svg-wrap">
                  <svg
                    viewBox={`0 0 460 ${Math.max(categories.length * 34 + 20, 110)}`}
                    className="category-mass-svg"
                    role="img"
                    aria-label="Category Mass Distribution SVG Chart"
                  >
                    {categories.slice(0, 5).map((cat, idx) => {
                      const mass = categoryMap[cat];
                      const pct = Math.round((mass / totalMass) * 100) || 0;
                      const barWidth = Math.max((mass / maxCategoryMass) * 230, 4);
                      const y = idx * 32 + 16;
                      return (
                        <g key={cat} className="bar-group">
                          {/* Category label */}
                          <text
                            x="115"
                            y={y + 11}
                            textAnchor="end"
                            className="chart-svg-text-label"
                          >
                            {cat.length > 15 ? cat.slice(0, 14) + "…" : cat}
                          </text>

                          {/* Background track */}
                          <rect
                            x="125"
                            y={y}
                            width="230"
                            height="14"
                            rx="3"
                            fill="rgba(255, 255, 255, 0.05)"
                          />

                          {/* Data bar */}
                          <rect
                            x="125"
                            y={y}
                            width={barWidth}
                            height="14"
                            rx="3"
                            fill="url(#limeGradient)"
                            className="chart-bar-anim"
                          />

                          {/* Value label */}
                          <text
                            x={130 + barWidth + 8}
                            y={y + 11}
                            className="chart-svg-text-val"
                          >
                            {mass.toLocaleString("en-IN")} kg ({pct}%)
                          </text>
                        </g>
                      );
                    })}
                    <defs>
                      <linearGradient id="limeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#a3e635" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              ) : (
                <div className="chart-empty-note">No lot mass data available for distribution.</div>
              )}
            </div>

            {/* 2. WORKFLOW STATUS SEGMENTATION (GENUINE SVG DONUT CHART) */}
            <div className="op-chart-card">
              <div className="chart-card-heading">
                <span className="chart-badge">PIPELINE STATUS</span>
                <h4>Workflow Custody Progress</h4>
              </div>

              {totalLots > 0 ? (
                <div className="donut-chart-container">
                  <div className="donut-svg-wrap">
                    <svg viewBox="0 0 100 100" className="donut-svg" role="img" aria-label="Workflow Status Donut Chart">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.06)"
                        strokeWidth="11"
                      />

                      {statusSegments.map((seg, idx) => {
                        const dashLength = (seg.count / totalLots) * circumference;
                        const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
                        const strokeDashoffset = -accumulatedOffset;
                        accumulatedOffset += dashLength;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="11"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            className="donut-segment-anim"
                          />
                        );
                      })}

                      {/* Center total readout */}
                      <text x="50" y="47" textAnchor="middle" className="donut-center-val">
                        {totalLots}
                      </text>
                      <text x="50" y="58" textAnchor="middle" className="donut-center-sub">
                        LOTS
                      </text>
                    </svg>
                  </div>

                  {/* Status Legend */}
                  <div className="donut-legend">
                    {statusSegments.map((seg, idx) => {
                      const pct = Math.round((seg.count / totalLots) * 100);
                      return (
                        <div key={idx} className="donut-legend-row">
                          <span className="legend-dot" style={{ backgroundColor: seg.color }} />
                          <span className="legend-label">{seg.label}</span>
                          <span className="legend-val">{seg.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="chart-empty-note">No active lots in the workflow pipeline.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
