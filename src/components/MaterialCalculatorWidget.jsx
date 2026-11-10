import React, { useState } from "react";
import { Calculator, CheckCircle2, AlertTriangle, Scale, ShieldCheck, ArrowRight, Zap } from "lucide-react";

const MATERIALS = [
  {
    name: "Lead-Acid & Lithium Batteries",
    code: "SCHEDULE I - B1",
    tolerancePct: 1.5,
    keyFractions: "Lead sponge, Lithium cobalt oxide, Plastic casing, Acid neutralizer",
    minWeight: 50,
    sampleWeight: 120,
    notes: "High toxicity hazard. Zero tolerance for casing puncture or leakage. Strict mass-balance auditing."
  },
  {
    name: "IT Server & PCB Scrap",
    code: "SCHEDULE I - ITEW1-16",
    tolerancePct: 2.5,
    keyFractions: "Gold (Au), Silver (Ag), Copper (Cu), Palladium (Pd), Epoxy resin",
    minWeight: 20,
    sampleWeight: 84.5,
    notes: "High commercial value density. Sensitive to dust, packaging moisture, and connector pin stripping."
  },
  {
    name: "Consumer Cooling & Appliances",
    code: "SCHEDULE I - CEEW1-5",
    tolerancePct: 5.0,
    keyFractions: "Compressor steel, Copper tubing, Aluminum fins, Purged refrigerant",
    minWeight: 80,
    sampleWeight: 150,
    notes: "Tare variance from polyurethane insulation foam crumble and heavy steel chassis brackets."
  },
  {
    name: "Mixed Cables & Non-Ferrous",
    code: "SCHEDULE I - MF1",
    tolerancePct: 4.0,
    keyFractions: "Electrolytic Copper conductor (99.9%), PVC & rubber insulation",
    minWeight: 30,
    sampleWeight: 65,
    notes: "Variance accounts for mechanical wire-stripping blade settings and terminal connector removal."
  }
];

export function MaterialCalculatorWidget({ onLaunchDemo }) {
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState(1); // IT Server & PCB
  const [declaredWeight, setDeclaredWeight] = useState("85");
  const [simulatedReceivingWeight, setSimulatedReceivingWeight] = useState("86.2");

  const mat = MATERIALS[selectedMaterialIndex];
  const decW = Math.max(0, parseFloat(declaredWeight) || 0);
  const recW = Math.max(0, parseFloat(simulatedReceivingWeight) || 0);

  const varianceKg = recW - decW;
  const variancePct = decW > 0 ? (varianceKg / decW) * 100 : 0;
  const absVariancePct = Math.abs(variancePct);
  const isWithinTolerance = absVariancePct <= mat.tolerancePct;

  const allowableMin = (decW * (1 - mat.tolerancePct / 100)).toFixed(2);
  const allowableMax = (decW * (1 + mat.tolerancePct / 100)).toFixed(2);

  return (
    <div className="material-calculator-widget">
      <div className="calc-header">
        <div className="calc-title-group">
          <span className="eyebrow">
            <Calculator size={14} className="text-lime" /> INTERACTIVE PROTOCOL SIMULATOR
          </span>
          <h3>Discrepancy & Mass-Balance Validator</h3>
          <p>
            Test how Scarap_Yukti evaluates receiving weighbridge variances against Schedule I engineering tolerances.
          </p>
        </div>
        <span className="live-compliance-badge">
          <ShieldCheck size={14} /> SPCB TOLERANCE ALIGNED
        </span>
      </div>

      <div className="calc-body-grid">
        {/* INPUTS COLUMN */}
        <div className="calc-input-panel">
          <label className="calc-field-label">
            <span>Material Classification</span>
            <select
              className="calc-select"
              value={selectedMaterialIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setSelectedMaterialIndex(idx);
                setDeclaredWeight(String(MATERIALS[idx].sampleWeight));
                setSimulatedReceivingWeight(String((MATERIALS[idx].sampleWeight * 1.01).toFixed(1)));
              }}
            >
              {MATERIALS.map((m, idx) => (
                <option key={m.name} value={idx}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </label>

          <div className="calc-two-col">
            <label className="calc-field-label">
              <span>Generator Declared Weight (kg)</span>
              <div className="calc-input-wrap">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  className="calc-input"
                  value={declaredWeight}
                  onChange={(e) => setDeclaredWeight(e.target.value)}
                />
                <span className="calc-unit">KG</span>
              </div>
            </label>

            <label className="calc-field-label">
              <span>Facility Receiving Net (kg)</span>
              <div className="calc-input-wrap">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="calc-input"
                  value={simulatedReceivingWeight}
                  onChange={(e) => setSimulatedReceivingWeight(e.target.value)}
                />
                <span className="calc-unit">KG</span>
              </div>
            </label>
          </div>

          <div className="calc-slider-wrap">
            <div className="calc-slider-header">
              <span>Simulate Weighbridge Reading Variation</span>
              <span className="calc-slider-val">{variancePct >= 0 ? `+${variancePct.toFixed(2)}%` : `${variancePct.toFixed(2)}%`}</span>
            </div>
            <input
              type="range"
              min={(decW * 0.92).toFixed(1)}
              max={(decW * 1.08).toFixed(1)}
              step="0.1"
              value={simulatedReceivingWeight}
              onChange={(e) => setSimulatedReceivingWeight(e.target.value)}
              className="calc-range-slider"
            />
            <div className="calc-slider-limits">
              <span>-8.0% (Loss)</span>
              <span>Nominal (0%)</span>
              <span>+8.0% (Gain)</span>
            </div>
          </div>

          <div className="calc-mat-notes">
            <small>
              <strong>Engineering Note:</strong> {mat.notes}
            </small>
          </div>
        </div>

        {/* OUTPUT VALIDATION RESULTS COLUMN */}
        <div className={`calc-result-panel ${isWithinTolerance ? "status-pass" : "status-flagged"}`}>
          <div className="result-header">
            <span className="result-indicator-pill">
              {isWithinTolerance ? (
                <>
                  <CheckCircle2 size={14} /> ADMISSIBLE TOLERANCE
                </>
              ) : (
                <>
                  <AlertTriangle size={14} /> DISCREPANCY FLAGGED
                </>
              )}
            </span>
            <span className="tolerance-tag">LIMIT: ±{mat.tolerancePct}%</span>
          </div>

          <div className="result-metrics-grid">
            <div className="res-metric-item">
              <span className="res-metric-label">Calculated Variance</span>
              <strong className={`res-metric-val ${isWithinTolerance ? "text-lime" : "text-amber"}`}>
                {variancePct >= 0 ? `+${variancePct.toFixed(2)}%` : `${variancePct.toFixed(2)}%`}
                <small>({varianceKg >= 0 ? `+${varianceKg.toFixed(2)}` : varianceKg.toFixed(2)} kg)</small>
              </strong>
            </div>

            <div className="res-metric-item">
              <span className="res-metric-label">Allowable Weight Band</span>
              <strong className="res-metric-val">
                {allowableMin} – {allowableMax} <small>kg</small>
              </strong>
            </div>
          </div>

          <div className="result-action-verdict">
            <strong>System Protocol Action:</strong>
            <p>
              {isWithinTolerance
                ? `Variance is within the approved ${mat.tolerancePct}% limit for ${mat.code}. Intake is automatically recorded, inventory balance adjusted, and payout unlocked.`
                : `Variance of ${absVariancePct.toFixed(2)}% exceeds the statutory ${mat.tolerancePct}% threshold. Automatic payout is FROZEN, and a physical dispute ticket is dispatched to Admin arbitration.`}
            </p>
          </div>

          <div className="result-fractions">
            <span className="fractions-label">Recoverable Material Streams:</span>
            <p className="fractions-text">{mat.keyFractions}</p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => onLaunchDemo("Recycler")}
          >
            <Zap size={15} /> Test Weighbridge in Recycler Demo <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
