import React, { useState } from "react";
import { PhysicalJourneyNarrative } from "./PhysicalJourneyNarrative.jsx";
import { MaterialCalculatorWidget } from "./MaterialCalculatorWidget.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Layers,
  Lock,
  Mail,
  Package,
  Recycle,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap
} from "lucide-react";

export function LandingPage({ onLaunchDemo, onSignIn }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    role: "Seller",
    inquiryType: "Pilot Demonstration",
    message: ""
  });
  const [contactError, setContactError] = useState("");

  const roles = [
    {
      id: "Seller",
      title: "Generators & Sellers",
      badge: "UPSTREAM INTAKE",
      tagline: "Small businesses, offices & households",
      description: "List obsolete electronics, server racks, and consumer scrap with automatic PII privacy shielding. Review competitive bids and coordinate pickup handovers.",
      metrics: "Privacy protected · Zero phone/address leaks",
      cta: "Launch Seller Demo",
      icon: <Package size={22} className="text-lime" />
    },
    {
      id: "Collector",
      title: "Aggregators & Collectors",
      badge: "CONSOLIDATION HUB",
      tagline: "Local scrap dealers & materials aggregators",
      description: "Discover eligible seller scrap across industrial corridors, claim pickup batches, record verified physical weights, and aggregate scrap into bulk recycler consignments.",
      metrics: "Multi-lot aggregation · Custody log",
      cta: "Launch Collector Demo",
      icon: <Truck size={22} className="text-lime" />
    },
    {
      id: "Recycler",
      title: "Authorized Recyclers",
      badge: "PROCESSING & SMELTING",
      tagline: "Registered dismantlers & R2/CPCB recyclers",
      description: "Browse material consignments by category and location, submit binding acquisition offers, record facility receiving weights, and document material processing.",
      metrics: "Weighbridge intake · Documented processing",
      cta: "Launch Recycler Demo",
      icon: <Recycle size={22} className="text-lime" />
    },
    {
      id: "Admin",
      title: "Compliance Officers",
      badge: "GOVERNANCE & AUDIT",
      tagline: "Marketplace compliance & audit oversight",
      description: "Monitor recorded mass balances, audit participant recycling evidence notes, manage category discrepancy flags, and arbitrate physical weight disputes.",
      metrics: "Append-only event log · Dispute arbitration",
      cta: "Launch Admin Demo",
      icon: <ShieldCheck size={22} className="text-lime" />
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Upstream Listing & Privacy Guard",
      actor: "Seller / Enterprise Generator",
      detail: "Seller posts surplus hardware with estimated weights and approximate zones. Database regex triggers reject phone numbers, emails, and residential addresses to eliminate off-platform leaks.",
      metric: "Privacy Guard Active"
    },
    {
      step: "02",
      title: "Aggregator Intake & Custody Handover",
      actor: "Verified Collector",
      detail: "Collector inspects and records scrap weight at the collection point. A secure handover token prevents unauthorized pickups, transferring verified custody to the aggregator.",
      metric: "On-Site Weighing"
    },
    {
      step: "03",
      title: "Consignment Bundling & Bidding",
      actor: "Collector → Recycler Network",
      detail: "Aggregator combines discrete collected lots into high-density industrial consignments. Authorized dismantlers and recyclers submit competitive offers under strict one-bid-per-lot rules.",
      metric: "Mass Balance Model"
    },
    {
      step: "04",
      title: "Weighbridge Intake & Refining Audit",
      actor: "Authorized Recycler & Admin",
      detail: "Recycler records facility receiving tare/net weight. Variances are evaluated against category-specific tolerance bands under our reference audit model, and evidence notes are logged in the event audit log.",
      metric: "Custody Audit Log"
    }
  ];

  const tolerances = [
    { category: "Lead-Acid & Lithium Batteries", code: "SCHEDULE I - B1", tolerance: "1.5%", rationale: "High unit value, hazardous acid handling; strict mass balance model." },
    { category: "IT Server & PCB Scrap", code: "SCHEDULE I - ITEW1-16", tolerance: "2.5%", rationale: "Precious metal yield (Au, Ag, Cu, Pd); tight moisture tolerance." },
    { category: "Consumer Cooling & Appliances", code: "SCHEDULE I - CEEW1-5", tolerance: "5.0%", rationale: "Insulation foam crumble and tare variation on large steel chassis." },
    { category: "Mixed Cables & Non-Ferrous", code: "SCHEDULE I - MF1", tolerance: "4.0%", rationale: "Plastic insulation jacket stripping and conductor cross-checks." }
  ];

  const faqs = [
    {
      question: "How does Scarap_Yukti protect generator privacy and eliminate off-platform leaks?",
      answer: "The platform executes automated regular-expression triggers inside PostgreSQL before any record is committed. Any listing title, pickup area, or note containing 10-digit phone numbers, email addresses, or precise residential markers (e.g. flat/door numbers) is aborted at the database boundary. Recyclers and collectors only see approximate municipal/industrial zones until bilateral custody is formally scheduled."
    },
    {
      question: "How does dual-point weight verification and handover token prevent scrap diversion?",
      answer: "When a Collector claims a lot and arrives at the pickup point, custody cannot transition on trust alone. The Collector enters the measured physical net weight, and the Seller releases a secure handover confirmation. The transition is recorded in an append-only audit log, preventing subsequent re-allocation or phantom pickups."
    },
    {
      question: "How does the mass-balance and facility receiving weighbridge verification operate?",
      answer: "When aggregated consignments reach the authorized recycling facility, the licensed Recycler records net receiving weights on an industrial weighbridge. The system compares receiving mass against collector intake mass. If discrepancy exceeds Schedule I tolerance bands (1.5% - 5.0%), an automated discrepancy flag alerts compliance auditors."
    },
    {
      question: "Is the platform aligned with the Indian E-Waste (Management) Rules, 2022?",
      answer: "Yes. Scarap_Yukti’s material categorization maps directly to Schedule I classifications (ITEW1-16, CEEW1-5) and supports EPR (Extended Producer Responsibility) documentation through digital chain-of-custody tracking and mass-balance discrepancy logging."
    },
    {
      question: "Can multiple recyclers flood a listing with speculative bids?",
      answer: "No. The database architecture enforces a strict 1-pending-bid-per-lot constraint for each recycler. Recyclers cannot spam bids or manipulate prices through multiple phantom accounts; each bid requires verified identity and locked terms."
    },
    {
      question: "How can informal collectors transition into formal marketplace participants?",
      answer: "Scarap_Yukti empowers informal collectors by providing them with digital aggregation tools, fair market transparency, and direct access to CPCB-registered recyclers, transitioning unorganized scrap pickers into recognized supply chain partners."
    }
  ];

  const commercialTiers = [
    {
      name: "Starter Generator",
      tagline: "Households, offices & retail sellers",
      badge: "FREE PROTOTYPE",
      price: "₹0",
      period: "per listing",
      features: [
        "PII Privacy Guard (auto-sanitization)",
        "Approximate zone geocoding",
        "Direct bids from verified collectors",
        "Digital pickup scheduling & OTP",
        "Basic disposal receipt"
      ],
      ctaText: "Launch Seller Demo",
      role: "Seller",
      highlight: false
    },
    {
      name: "Industrial Aggregator",
      tagline: "Scrap collectors & consolidation yards",
      badge: "CORE WORKFLOW",
      price: "1.5%",
      period: "per settled transaction",
      features: [
        "Upstream lot discovery & claim rights",
        "Multi-lot consignment bundling",
        "On-site weight & intake logging",
        "Direct auction to CPCB smelters",
        "Anti-diversion digital custody trail"
      ],
      ctaText: "Launch Collector Demo",
      role: "Collector",
      highlight: true
    },
    {
      name: "Certified Smelter / Recycler",
      tagline: "R2 & CPCB-registered recycling plants",
      badge: "ENTERPRISE COMPLIANCE",
      price: "Custom",
      period: "annual licensing",
      features: [
        "Bulk consignment bidding access",
        "Weighbridge intake integration",
        "Schedule I mass-balance discrepancy engine",
        "Structured compliance audit log export",
        "Dispute arbitration ledger"
      ],
      ctaText: "Launch Recycler Demo",
      role: "Recycler",
      highlight: false
    }
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactError("Please fill out all required fields before submitting.");
      return;
    }
    if (!contactForm.email.includes("@") || !contactForm.email.includes(".")) {
      setContactError("Please provide a valid work email address.");
      return;
    }
    setContactError("");
    setContactSubmitted(true);
  };

  return (
    <div className="landing-layout">
      {/* 1. TOP INDUSTRIAL NAVIGATION */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#" className="landing-brand">
            <span className="landing-brand-icon">
              <Recycle size={22} />
            </span>
            <div>
              <strong>Scarap_Yukti</strong>
              <span>CLOSED-LOOP E-WASTE LOGISTICS</span>
            </div>
          </a>

          <nav className="landing-nav-links" aria-label="Landing Page Navigation">
            <a href="#problem">The Problem</a>
            <a href="#solution">Solution</a>
            <a href="#journey">Physical Circuit</a>
            <a href="#workflow">How It Works</a>
            <a href="#roles">Role Ecosystem</a>
            <a href="#differentiators">Differentiators</a>
            <a href="#compliance">Tolerances</a>
            <a href="#pricing">Plans</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-light btn-small"
              onClick={onSignIn}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => onLaunchDemo("Collector")}
            >
              Explore Demo <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. CINEMATIC HERO SECTION WITH VIDEO BACKDROP & POSTER FALLBACK */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-backdrop">
          {/* Background Video with Poster Fallback */}
          <div className="hero-video-container">
            <video
              className="hero-background-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={((import.meta.env?.BASE_URL || "/").replace(/\/$/, "") + "/videos/scarap-hero-poster.webp")}
              aria-label="Cinematic background footage of industrial e-waste recycling and printed circuit board sorting"
            >
              <source
                src={((import.meta.env?.BASE_URL || "/").replace(/\/$/, "") + "/videos/scarap-hero.mp4")}
                type="video/mp4"
              />
            </video>
            <div className="hero-video-overlay" />
          </div>
          <div className="hero-grid-pattern" />
          <div className="hero-radial-glow" />
        </div>

        <div className="landing-hero-content">
          <div className="hero-eyebrow">
            <span className="live-pulse-dot" />
            <span>RESPONSIBLE CIRCULAR ECONOMY PLATFORM</span>
            <span className="hero-badge-pill">INDIAN E-WASTE RULES 2022 ALIGNED · PROTOTYPE WORKFLOW</span>
          </div>

          <h1 className="hero-title">
            Industrial E-Waste Logistics.
            <br />
            <span className="hero-title-highlight">Audited Custody. Closed Loops.</span>
          </h1>

          <p className="hero-subtitle">
            A specialized marketplace prototype connecting electronic scrap generators, local aggregators, and authorized recyclers with verified on-site weighing, tamper-evident handovers, and append-only audit logs.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn btn-primary btn-hero"
              onClick={() => onLaunchDemo("Collector")}
            >
              <Zap size={18} />
              <span>Test-Drive Platform (Demo Mode)</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="btn btn-light btn-hero"
              onClick={onSignIn}
            >
              <Lock size={16} />
              <span>Sign In with Supabase</span>
            </button>
          </div>

          {/* QUICK ROLE SELECTOR LAUNCHPAD */}
          <div className="hero-role-launchpad" id="testdrive">
            <div className="launchpad-header">
              <div>
                <strong>Instant Role Experience (No Sign-In Required)</strong>
                <p>Select a persona to immediately inspect its dedicated workspace with local demo data:</p>
              </div>
              <span className="demo-tag-pill">LOCAL BROWSER DEMO</span>
            </div>

            <div className="hero-roles-grid">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="hero-role-card"
                  onClick={() => onLaunchDemo(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLaunchDemo(r.id); }}
                >
                  <div className="role-card-top">
                    <div className="role-card-icon">{r.icon}</div>
                    <span className="role-card-badge">{r.badge}</span>
                  </div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  <div className="role-card-footer">
                    <span>{r.metrics}</span>
                    <button type="button" className="role-launch-btn">
                      {r.cta} <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM REPOSITORY FACTS STRIP */}
      <section className="landing-stats-strip">
        <div className="stats-strip-inner">
          <div className="stat-strip-item">
            <span className="stat-strip-val">4 Roles</span>
            <span className="stat-strip-label">Sellers, Collectors, Recyclers & Admins fully differentiated</span>
          </div>
          <div className="stat-strip-sep" />
          <div className="stat-strip-item">
            <span className="stat-strip-val">81 Tests</span>
            <span className="stat-strip-label">Passing automated database security, RLS & workflow assertions</span>
          </div>
          <div className="stat-strip-sep" />
          <div className="stat-strip-item">
            <span className="stat-strip-val">Zero PII Leaks</span>
            <span className="stat-strip-label">Database triggers reject phone numbers & residential addresses</span>
          </div>
          <div className="stat-strip-sep" />
          <div className="stat-strip-item">
            <span className="stat-strip-val">Mass Balance Model</span>
            <span className="stat-strip-label">Intake weight verified against facility receiving weighbridge</span>
          </div>
        </div>
      </section>

      {/* 4. THE E-WASTE PROBLEM & INDUSTRY CONTEXT */}
      <section className="landing-section" id="problem">
        <div className="section-header">
          <span className="section-eyebrow">
            <AlertTriangle size={15} /> THE BROKEN CIRCUIT
          </span>
          <h2>The Hazardous Reality of Unregulated E-Waste</h2>
          <p>
            India generates over 1.7 million metric tonnes of electronic scrap each year. Over 95% is handled by unorganized informal sectors with zero environmental safeguards.
          </p>
        </div>

        <div className="problem-grid">
          <div className="problem-card">
            <div className="problem-card-icon text-red">
              <AlertTriangle size={24} />
            </div>
            <h3>Toxic Acid Leaching & Burning</h3>
            <p>
              Informal scrap workers use open cyanide baths and open-pit burning to extract gold and copper from circuit boards, venting dioxins and contaminating local groundwater tables.
            </p>
            <div className="problem-tag">95% Unscientific Processing</div>
          </div>

          <div className="problem-card">
            <div className="problem-card-icon text-amber">
              <Lock size={24} />
            </div>
            <h3>Privacy Leaks & Scams</h3>
            <p>
              When generators dispose of surplus hardware through generic classifieds or local scrap touts, phone numbers and exact office addresses are harvested, sparking off-platform fraud.
            </p>
            <div className="problem-tag">Zero PII Controls</div>
          </div>

          <div className="problem-card">
            <div className="problem-card-icon text-cyan">
              <TrendingUp size={24} />
            </div>
            <h3>Off-Platform Material Diversion</h3>
            <p>
              Middlemen siphon high-value server scrap and battery chemistries away from authorized CPCB dismantlers, dumping hazardous slag into municipal landfills without a paper trail.
            </p>
            <div className="problem-tag">Untracked Custody Slag</div>
          </div>

          <div className="problem-card">
            <div className="problem-card-icon text-lime">
              <Scale size={24} />
            </div>
            <h3>Fictitious EPR Accounting</h3>
            <p>
              Brands and registered recyclers struggle with unverified weighment claims and speculative trading credits because physical scrap handovers lack structured digital corroboration.
            </p>
            <div className="problem-tag">Discrepancy Blindspots</div>
          </div>
        </div>
      </section>

      {/* 5. THE SCARAP_YUKTI SOLUTION */}
      <section className="landing-section dark-alt" id="solution">
        <div className="section-header">
          <span className="section-eyebrow">
            <ShieldCheck size={15} /> THE CLOSED-LOOP SOLUTION
          </span>
          <h2>Engineered Accountability From Drawer to Smelter</h2>
          <p>
            Scarap_Yukti transforms fragmented scrap transactions into a verified, tamper-evident digital custody circuit.
          </p>
        </div>

        <div className="solution-features-grid">
          <div className="solution-feature-box">
            <div className="feature-icon"><Lock size={20} /></div>
            <h4>Automatic PII Sanitization</h4>
            <p>
              PostgreSQL regex triggers enforce strict privacy boundaries. Any listing containing telephone numbers or exact door addresses is rejected at insertion.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><Truck size={20} /></div>
            <h4>Dual-Party Intake Verification</h4>
            <p>
              Verified collectors record measured on-site weights at pickup. Handover OTP tokens lock custody before material moves.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><Layers size={20} /></div>
            <h4>High-Density Consignment Bundling</h4>
            <p>
              Aggregators bundle discrete household and SMB scrap into industrial-grade consignments ready for bulk auction to certified recyclers.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><Scale size={20} /></div>
            <h4>Mass-Balance Tolerance Engine</h4>
            <p>
              Facility weighbridge net weights are reconciled against intake weights using Schedule I discrepancy bands (1.5% - 5.0%), surfacing diversion flags.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SIGNATURE PHYSICAL JOURNEY CIRCUIT */}
      <section className="landing-section-journey" id="journey">
        <PhysicalJourneyNarrative onLaunchDemo={onLaunchDemo} />
      </section>

      {/* 7. 4-STAGE MATERIAL WORKFLOW */}
      <section className="landing-section" id="workflow">
        <div className="section-header">
          <span className="section-eyebrow">
            <Layers size={15} /> TRACEABLE END-TO-END WORKFLOW
          </span>
          <h2>How Material Moves Through the Scarap_Yukti Network</h2>
          <p>From office disposal to certified metals extraction: every lot transition is logged.</p>
        </div>

        <div className="workflow-steps-grid">
          {workflowSteps.map((s) => (
            <div key={s.step} className="workflow-step-card">
              <div className="step-number">{s.step}</div>
              <div className="step-actor">{s.actor}</div>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
              <div className="step-metric-tag">
                <CheckCircle2 size={13} />
                <span>{s.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. ROLE ECOSYSTEM DEEP-DIVE */}
      <section className="landing-section dark-alt" id="roles">
        <div className="section-header">
          <span className="section-eyebrow">
            <Users size={15} /> 4 INTEGRATED PARTICIPANT ROLES
          </span>
          <h2>A Differentiated Ecosystem for Every Stakeholder</h2>
          <p>
            Each participant operates inside a strictly isolated, purpose-built workspace governed by database row-level security.
          </p>
        </div>

        <div className="roles-detail-grid">
          {roles.map((r) => (
            <div key={r.id} className="role-detail-card">
              <div className="role-detail-header">
                <div className="role-detail-icon">{r.icon}</div>
                <div>
                  <span className="role-detail-badge">{r.badge}</span>
                  <h3>{r.title}</h3>
                </div>
              </div>
              <p className="role-detail-tagline">{r.tagline}</p>
              <p className="role-detail-desc">{r.description}</p>
              <div className="role-detail-metrics">
                <strong>Guarantees:</strong> {r.metrics}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-small w-full"
                onClick={() => onLaunchDemo(r.id)}
              >
                {r.cta} <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 9. MARKETPLACE INTEGRITY & ANTI-DIVERSION CONTROLS */}
      <section className="landing-section" id="controls">
        <div className="section-header">
          <span className="section-eyebrow">
            <Lock size={15} /> ENTERPRISE ACCESS CONTROLS
          </span>
          <h2>Role-Gated Operational Boundaries</h2>
          <p>
            Unlike generic marketplaces where any user can click any action, Scarap_Yukti strictly enforces backend database boundaries and row-level security.
          </p>
        </div>

        <div className="security-cards-grid">
          <div className="security-card">
            <div className="security-icon"><ShieldCheck size={20} /></div>
            <h4>Handover Weighing Gating</h4>
            <p>
              Sellers and Collectors are strictly barred from recording verified handover weights. Receiving weight recording is exclusively authorized for the winning certified Recycler at facility intake.
            </p>
          </div>

          <div className="security-card">
            <div className="security-icon"><Scale size={20} /></div>
            <h4>Lot Status Modification Locking</h4>
            <p>
              Once a lot receives a commercial bid or advances into pickup coordination, editing lot details is permanently locked at the database level to prevent post-agreement price or weight manipulation.
            </p>
          </div>

          <div className="security-card">
            <div className="security-icon"><Database size={20} /></div>
            <h4>Admin Workflow Separation</h4>
            <p>
              Administrative workflow advancement is executed exclusively via Security-Definer stored procedures (`advance_lot_workflow`). Admin privileges can never be self-assigned through client queries.
            </p>
          </div>

          <div className="security-card">
            <div className="security-icon"><FileCheck2 size={20} /></div>
            <h4>Privacy Regex Enforcement</h4>
            <p>
              Listing titles, locations, and notes are sanitized by PostgreSQL triggers. Direct REST API calls attempting to insert 10-digit Indian mobile numbers or door-level addresses are immediately aborted.
            </p>
          </div>
        </div>
      </section>

      {/* 10. MATERIAL DISCREPANCY & MASS-BALANCE VALIDATOR */}
      <section className="landing-section dark-alt" id="compliance">
        <div className="section-header">
          <span className="section-eyebrow">
            <Scale size={15} /> PHYSICAL ACCURACY & REGULATORY REALITY
          </span>
          <h2>Configurable Discrepancy Thresholds</h2>
          <p>
            Real scrap changes mass due to tare variations, moisture loss, and dismantling. Universal 10% rules fail in the real world. We model category-specific thresholds based on Schedule I classifications.
          </p>
        </div>

        <div className="inline-hint tolerance-disclaimer-banner">
          <ShieldAlert size={16} className="text-amber" />
          <span>
            <strong>Regulatory Notice:</strong> The tolerance percentages below represent an illustrative engineering model configured for prototype demonstration. In live commercial operations, legally binding thresholds depend on State Pollution Control Board (SPCB) permits, CPCB portal schedules, and bilaterally agreed supply contracts.
          </span>
        </div>

        <MaterialCalculatorWidget onLaunchDemo={onLaunchDemo} />

        <div className="tolerance-table-wrap">
          <table className="tolerance-table">
            <thead>
              <tr>
                <th>MATERIAL CATEGORY</th>
                <th>SCHEDULE CODE</th>
                <th>ALLOWABLE VARIANCE</th>
                <th>ENGINEERING & COMPLIANCE RATIONALE</th>
              </tr>
            </thead>
            <tbody>
              {tolerances.map((t) => (
                <tr key={t.category}>
                  <td><strong>{t.category}</strong></td>
                  <td><span className="code-pill">{t.code}</span></td>
                  <td><span className="tolerance-pill">{t.tolerance}</span></td>
                  <td>{t.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 11. PLATFORM DIFFERENTIATORS MATRIX */}
      <section className="landing-section" id="differentiators">
        <div className="section-header">
          <span className="section-eyebrow">
            <Sparkles size={15} /> WHY SCARAP_YUKTI STANDS OUT
          </span>
          <h2>Platform Differentiators Matrix</h2>
          <p>
            How Scarap_Yukti compares against traditional informal kabadi dealers and generic online B2B classifieds.
          </p>
        </div>

        <div className="differentiator-table-wrap">
          <table className="differentiator-table">
            <thead>
              <tr>
                <th>OPERATIONAL CRITERIA</th>
                <th>INFORMAL DEALERS</th>
                <th>GENERIC CLASSIFIEDS</th>
                <th className="highlight-col">SCARAP_YUKTI PLATFORM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Upstream PII Protection</strong></td>
                <td><span className="matrix-cross">✕</span> Open leaks to third-party touts</td>
                <td><span className="matrix-cross">✕</span> Phone numbers openly scraped</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>Automated DB Regex Triggers</strong> (Strictly approximate zones)</td>
              </tr>
              <tr>
                <td><strong>Custody Transfer Integrity</strong></td>
                <td><span className="matrix-cross">✕</span> Cash handover, no paper trail</td>
                <td><span className="matrix-cross">✕</span> Unmonitored off-platform meetup</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>On-Site Weighing + Handover OTP</strong> (Audited custody log)</td>
              </tr>
              <tr>
                <td><strong>Mass-Balance Verification</strong></td>
                <td><span className="matrix-cross">✕</span> Untracked acid dumping & slag</td>
                <td><span className="matrix-cross">✕</span> Zero mass audit or reconciliation</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>Schedule I Tolerance Engine</strong> (1.5% - 5.0% threshold check)</td>
              </tr>
              <tr>
                <td><strong>EPR Compliance Alignment</strong></td>
                <td><span className="matrix-cross">✕</span> Non-compliant hazardous operations</td>
                <td><span className="matrix-cross">✕</span> Disclaimed bulletin board model</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>Indian E-Waste Rules 2022</strong> (Schedule I classification & audit trail)</td>
              </tr>
              <tr>
                <td><strong>Bidding & Price Transparency</strong></td>
                <td><span className="matrix-cross">✕</span> Predatory middleman margins</td>
                <td><span className="matrix-cross">✕</span> Unchecked phantom fake bids</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>1-Bid-Per-Lot RLS Constraint</strong> (Fair competitive pricing)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 12. ABOUT SCARAP_YUKTI */}
      <section className="landing-section dark-alt" id="about">
        <div className="section-header">
          <span className="section-eyebrow">
            <Building2 size={15} /> ABOUT SCARAP_YUKTI
          </span>
          <h2>Built for the Future of Circular Metallurgy</h2>
          <p>
            Bridging grassroot informal waste pickers with certified industrial smelters through secure digital logistics.
          </p>
        </div>

        <div className="about-content-grid">
          <div className="about-text-panel">
            <h3>Origin & Mission</h3>
            <p>
              Scarap_Yukti was conceived to solve the critical gap in India's circular economy: high-grade electronic scrap originates in distributed households and offices, but legitimate smelters require massive consolidated tonnage with verifiable audit trails.
            </p>
            <p>
              Without technology, informal scrap pickers are exploited by exploitative middlemen, and valuable precious metals (Gold, Silver, Palladium, Copper) are lost to toxic backyard acid distillation.
            </p>
            <p>
              Scarap_Yukti provides the digital backbone: privacy for sellers, consolidation tools for aggregators, and verified mass-balance tracking for authorized recyclers.
            </p>
          </div>

          <div className="about-stats-panel">
            <div className="about-stat-box">
              <span className="stat-number">4 Roles</span>
              <span className="stat-desc">Unified operating workflow across Sellers, Collectors, Recyclers & Regulators</span>
            </div>
            <div className="about-stat-box">
              <span className="stat-number">100% Traceable</span>
              <span className="stat-desc">Database-audited custody trail with timestamped event logging</span>
            </div>
            <div className="about-stat-box">
              <span className="stat-number">Zero Blind Handshakes</span>
              <span className="stat-desc">Mutual confirmation required for every physical custody transfer</span>
            </div>
          </div>
        </div>
      </section>

      {/* 13. CONCEPTUAL COMMERCIAL PLANS & TIERS */}
      <section className="landing-section" id="pricing">
        <div className="section-header">
          <span className="section-eyebrow">
            <Wallet size={15} /> TRANSPARENT PARTICIPATION TIERS
          </span>
          <h2>Conceptual Commercial Tiers</h2>
          <p>
            Structured models designed to incentivize formalization across generators, aggregators, and industrial processors.
          </p>
        </div>

        <div className="pricing-cards-grid">
          {commercialTiers.map((tier) => (
            <div
              key={tier.name}
              className={`commercial-tier-card ${tier.highlight ? "tier-highlight" : ""}`}
            >
              {tier.highlight && <div className="tier-badge-top">RECOMMENDED FOR AGGREGATORS</div>}
              <div className="tier-header">
                <span className="tier-role-badge">{tier.badge}</span>
                <h3>{tier.name}</h3>
                <p>{tier.tagline}</p>
              </div>

              <div className="tier-price-box">
                <span className="tier-price">{tier.price}</span>
                <span className="tier-period">{tier.period}</span>
              </div>

              <ul className="tier-features-list">
                {tier.features.map((feat, idx) => (
                  <li key={idx}>
                    <Check size={16} className="text-lime" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`btn ${tier.highlight ? "btn-primary" : "btn-light"} w-full`}
                onClick={() => onLaunchDemo(tier.role)}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>
        <p className="pricing-disclaimer">
          * Note: Commercial tier rates represent illustrative prototype projections. In actual enterprise deployment, settlement terms are governed by commercial bilateral agreements.
        </p>
      </section>

      {/* 14. INTERACTIVE FAQ ACCORDION */}
      <section className="landing-section dark-alt" id="faq">
        <div className="section-header">
          <span className="section-eyebrow">
            <HelpCircle size={15} /> FREQUENTLY ASKED QUESTIONS
          </span>
          <h2>Everything You Need to Know</h2>
          <p>
            Detailed answers regarding privacy, custody tokens, weighbridge audits, and statutory alignment.
          </p>
        </div>

        <div className="faq-accordion-container">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`faq-item ${isOpen ? "faq-open" : ""}`}
              >
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`faq-chevron ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="faq-answer-panel">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 15. CONTACT & ENTERPRISE INQUIRY FORM */}
      <section className="landing-section" id="contact">
        <div className="section-header">
          <span className="section-eyebrow">
            <Mail size={15} /> PROTOTYPE INTERACTION
          </span>
          <h2>Enterprise & Regulatory Inquiries</h2>
          <p>
            Simulate a dedicated pilot demonstration request, enterprise inquiry, or aggregator onboarding query. Form validates client-side in prototype mode.
          </p>
        </div>

        <div className="contact-layout-box">
          <div className="contact-info-panel">
            <h3>Start Your Closed-Loop Transition</h3>
            <p>
              Whether you are an enterprise generator needing certified disposal, an aggregator scaling your consolidation yard, or a licensed recycler requiring steady audited feedstocks, our architecture delivers compliance.
            </p>

            <div className="contact-meta-items">
              <div className="contact-meta-row">
                <ShieldCheck size={18} className="text-lime" />
                <span>EPR & statutory workflow alignment based on Indian E-Waste Rules 2022</span>
              </div>
              <div className="contact-meta-row">
                <Database size={18} className="text-lime" />
                <span>Schema architecture designed for weighbridge & telemetry ingestion</span>
              </div>
              <div className="contact-meta-row">
                <CheckCircle2 size={18} className="text-lime" />
                <span>Interactive prototype demonstration with local client-side validation</span>
              </div>
            </div>
          </div>

          <div className="contact-form-panel">
            {contactSubmitted ? (
              <div className="contact-success-state" role="status">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={36} className="text-lime" />
                </div>
                <h3>Inquiry Validated (Prototype Demonstration)</h3>
                <p>
                  Thank you, <strong>{contactForm.name}</strong>. Your test inquiry regarding <strong>{contactForm.inquiryType}</strong> was validated client-side. In this prototype demonstration, no external network request was dispatched to email servers.
                </p>
                <button
                  type="button"
                  className="btn btn-light btn-small"
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactForm({ name: "", email: "", role: "Seller", inquiryType: "Pilot Demonstration", message: "" });
                  }}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="contact-form-inner">
                {contactError && (
                  <div className="form-error" role="alert">
                    {contactError}
                  </div>
                )}

                <div className="form-row-dual">
                  <label>
                    Full Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Work Email *
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@company.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </label>
                </div>

                <div className="form-row-dual">
                  <label>
                    Your Organization Role
                    <select
                      value={contactForm.role}
                      onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                    >
                      <option value="Seller">Enterprise Generator / Seller</option>
                      <option value="Collector">Scrap Collector / Aggregator</option>
                      <option value="Recycler">Registered Recycler / Dismantler</option>
                      <option value="Admin">Platform Compliance & Audit Admin</option>
                      <option value="Other">Other Stakeholder</option>
                    </select>
                  </label>
                  <label>
                    Inquiry Type
                    <select
                      value={contactForm.inquiryType}
                      onChange={(e) => setContactForm({ ...contactForm, inquiryType: e.target.value })}
                    >
                      <option value="Pilot Demonstration">Pilot Demonstration</option>
                      <option value="Aggregator Partnership">Aggregator Partnership</option>
                      <option value="Weighbridge API Integration">Weighbridge API Integration</option>
                      <option value="Regulatory / SPCB Audit">Regulatory / SPCB Audit</option>
                      <option value="General Question">General Question</option>
                    </select>
                  </label>
                </div>

                <label>
                  Message / Facility Details *
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your scrap volume, facility location, or specific integration requirements..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  />
                </label>

                <button type="submit" className="btn btn-primary w-full">
                  <Send size={16} /> Send Enterprise Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 16. FINAL DEMO LAUNCH CTA */}
      <section className="landing-cta-banner">
        <div className="cta-banner-inner">
          <div className="cta-copy">
            <span className="eyebrow"><Sparkles size={14} /> READY FOR EVALUATION</span>
            <h2>Experience the Complete Circular Chain</h2>
            <p>
              Launch the local demo to explore distinct dashboards for Sellers, Collectors, Recyclers, and Admins, or sign in with your Supabase account.
            </p>
          </div>
          <div className="cta-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onLaunchDemo("Collector")}
            >
              <Zap size={16} /> Launch Interactive Demo
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={onSignIn}
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* 17. PROFESSIONAL ENTERPRISE FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="footer-logo">
                <Recycle size={22} className="text-lime" />
                <strong>Scarap_Yukti</strong>
              </div>
              <p>
                Closed-loop e-waste aggregation, verified custody, and anti-diversion governance platform. Built for Indian E-Waste Rules 2022 alignment.
              </p>
              <div className="footer-security-pill">
                <ShieldCheck size={14} /> 81 Automated Unit & Integration Tests Passing
              </div>
            </div>

            <div className="footer-nav-col">
              <h4>PLATFORM</h4>
              <a href="#hero">Overview</a>
              <a href="#journey">Physical Circuit</a>
              <a href="#workflow">4-Stage Workflow</a>
              <a href="#roles">Role Ecosystem</a>
              <a href="#compliance">Tolerance Engine</a>
            </div>

            <div className="footer-nav-col">
              <h4>ROLES</h4>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Seller")}>Sellers & Generators</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Collector")}>Collectors & Yards</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Recycler")}>Certified Recyclers</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Admin")}>Compliance Officers</button>
            </div>

            <div className="footer-nav-col">
              <h4>COMPLIANCE</h4>
              <a href="#problem">Hazard Context</a>
              <a href="#differentiators">Platform Matrix</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">Enterprise Contact</a>
              <button type="button" className="footer-link-btn" onClick={onSignIn}>Supabase Sign In</button>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span>Prototype Environment · PostgreSQL RLS Enforced · Indian E-Waste (Management) Rules 2022</span>
            <small>© 2026 Scarap_Yukti. Built for responsible e-waste recirculation and circular metallurgy.</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
