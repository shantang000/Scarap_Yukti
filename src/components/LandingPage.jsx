import React, { useEffect, useState } from "react";
import { PhysicalJourneyNarrative } from "./PhysicalJourneyNarrative.jsx";
import { MaterialCalculatorWidget } from "./MaterialCalculatorWidget.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  Mail,
  Package,
  Recycle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap
} from "lucide-react";

export function LandingPage({ onLaunchDemo, onSignIn }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [loadHeroVideo, setLoadHeroVideo] = useState(false);

  // Load background video lazily on capable desktop viewports only when reduced-motion & save-data are off
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const isSmallViewport = window.innerWidth < 768;
    const saveData = Boolean(navigator?.connection?.saveData);
    if (!prefersReducedMotion && !isSmallViewport && !saveData) {
      setLoadHeroVideo(true);
    }
  }, []);

  const roles = [
    {
      id: "Seller",
      title: "Sellers & Businesses",
      badge: "LIST SCRAP",
      tagline: "Offices, factories, IT teams & households",
      description:
        "Post retired computers, servers, batteries, and electronics with approximate location only. Compare incoming buyer offers before sharing pickup timing.",
      metrics: "Contact details hidden until offer acceptance",
      cta: "Launch Seller Demo",
      icon: <Package size={22} className="text-lime" />
    },
    {
      id: "Collector",
      title: "Collectors & Aggregators",
      badge: "PICKUP & BUNDLE",
      tagline: "Local scrap dealers & collection hubs",
      description:
        "Browse available seller pickup batches in the demo feed, schedule planned pickups, and bundle collected materials into bulk lots for recycler offers.",
      metrics: "Batch consolidation · Offer management",
      cta: "Launch Collector Demo",
      icon: <Truck size={22} className="text-lime" />
    },
    {
      id: "Recycler",
      title: "Recyclers & Dismantlers",
      badge: "BID & RECEIVE",
      tagline: "E-waste processing & refining facilities",
      description:
        "Filter open lots by material type and city, submit one transparent bid per lot, confirm pickup dates, and record receiving weight at facility intake.",
      metrics: "1-bid-per-lot rule · Intake weight logging",
      cta: "Launch Recycler Demo",
      icon: <Recycle size={22} className="text-lime" />
    },
    {
      id: "Admin",
      title: "Compliance Admins",
      badge: "AUDIT & REVIEW",
      tagline: "Operations supervision & exception handling",
      description:
        "Monitor active listings, filter flagged weight discrepancies (>10%), review processing notes, place dispute holds, and export workspace records to CSV.",
      metrics: "Audit history · Dispute holds & CSV export",
      cta: "Launch Admin Demo",
      icon: <ShieldCheck size={22} className="text-lime" />
    }
  ];

  const tolerances = [
    {
      category: "Lead-Acid & Lithium Batteries",
      code: "SCHEDULE I - B1",
      tolerance: "1.5%",
      rationale: "High toxicity hazard and dense casing; tighter expected weight consistency."
    },
    {
      category: "IT Server & PCB Scrap",
      code: "SCHEDULE I - ITEW1-16",
      tolerance: "2.5%",
      rationale: "Circuit boards and server assemblies sensitive to missing components or moisture."
    },
    {
      category: "Consumer Cooling & Appliances",
      code: "SCHEDULE I - CEEW1-5",
      tolerance: "5.0%",
      rationale: "Insulation foam crumble and heavy steel enclosure tare variation."
    },
    {
      category: "Mixed Cables & Non-Ferrous",
      code: "SCHEDULE I - MF1",
      tolerance: "4.0%",
      rationale: "Cable jacket stripping and insulation moisture loss."
    }
  ];

  const faqs = [
    {
      question: "How does Scarap_Yukti protect my phone number and street address?",
      answer:
        "Public listings only show your general industrial zone or city (for example, 'Peenya Industrial Area, Bengaluru'). Automated privacy checks prevent phone numbers, email addresses, and exact flat/door numbers from being published in listing titles, areas, or notes so scrap touts cannot scrape your contact details."
    },
    {
      question: "What happens after I accept a recycler's offer?",
      answer:
        "Accepting one offer automatically declines other pending offers on that lot and opens pickup time coordination. The listing owner proposes a pickup date and time, and the accepted recycler confirms or requests another window. Transport dispatch, physical weighing, and payments are arranged directly between the parties."
    },
    {
      question: "Are recycler licenses, payments, or Form-6 certificates handled automatically here?",
      answer:
        "No. In this current prototype, license checks, payment settlement (UPI/NEFT/escrow), physical weighbridge hardware integration, and statutory Form-6 certificates happen outside the software. Workflow statuses and CSV exports track what participants record in the app."
    },
    {
      question: "Why can a recycler only submit one offer per lot?",
      answer:
        "Limiting each recycler to a single pending bid per lot prevents auction flooding and keeps offer comparison clear for sellers and collectors."
    },
    {
      question: "Why do I see a difference between Interactive Demo Mode and Sign In?",
      answer:
        "Interactive Demo Mode lets you test all four role dashboards immediately using isolated sample data saved only in your browser tab. Signing in connects you to a persistent account workspace with strict role boundaries."
    }
  ];

  const basePath = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");

  return (
    <div className="landing-layout">
      {/* 1. TOP NAVIGATION */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#hero" className="landing-brand">
            <span className="landing-brand-icon">
              <Recycle size={22} />
            </span>
            <div>
              <strong>Scarap_Yukti</strong>
              <span>RESPONSIBLE E-WASTE MARKETPLACE</span>
            </div>
          </a>

          <nav className="landing-nav-links" aria-label="Landing Page Navigation">
            <a href="#safeguards">Safeguards</a>
            <a href="#journey">How It Works</a>
            <a href="#roles">Roles</a>
            <a href="#compliance">Weight Rules</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Availability</a>
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
              onClick={() => onLaunchDemo("Seller")}
            >
              Explore Demo <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-backdrop">
          <div className="hero-video-container">
            {loadHeroVideo ? (
              <video
                className="hero-background-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={`${basePath}/videos/scarap-hero-poster.webp`}
                aria-label="Background visual of industrial electronic scrap sorting"
              >
                <source src={`${basePath}/videos/scarap-hero.mp4`} type="video/mp4" />
              </video>
            ) : (
              <img
                src={`${basePath}/videos/scarap-hero-poster.webp`}
                alt=""
                className="hero-poster-fallback"
                loading="eager"
              />
            )}
            <div className="hero-video-overlay" />
          </div>
          <div className="hero-grid-pattern" />
          <div className="hero-radial-glow" />
        </div>

        <div className="landing-hero-content">
          <div className="hero-eyebrow">
            <span className="live-pulse-dot" />
            <span>CIRCULAR E-WASTE LOGISTICS PROTOTYPE</span>
            <span className="hero-badge-pill">INDIAN E-WASTE RULES 2022 ALIGNED MODEL</span>
          </div>

          <h1 className="hero-title">
            Sell, Collect, and Recycle E-Waste
            <br />
            <span className="hero-title-highlight">With Tracked Custody.</span>
          </h1>

          <p className="hero-subtitle">
            Connect electronic scrap sellers, local collectors, and registered recyclers in one clear workflow—with area-only privacy protection, single-bid offer comparison, and receiving weight tracking.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn btn-primary btn-hero"
              onClick={() => onLaunchDemo("Seller")}
            >
              <Zap size={18} />
              <span>Explore Interactive Demo</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="btn btn-light btn-hero"
              onClick={onSignIn}
            >
              <Lock size={16} />
              <span>Sign In</span>
            </button>
          </div>

          {/* QUICK ROLE SELECTOR LAUNCHPAD */}
          <div className="hero-role-launchpad" id="testdrive">
            <div className="launchpad-header">
              <div>
                <strong>Try Any Workspace Instantly (No Account Needed)</strong>
                <p>Select your role below to explore sample listings, bids, and custody workflows right in your browser:</p>
              </div>
              <span className="demo-tag-pill">BROWSER SANDBOX DEMO</span>
            </div>

            <div className="hero-roles-grid">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="hero-role-card"
                  onClick={() => onLaunchDemo(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onLaunchDemo(r.id);
                    }
                  }}
                >
                  <div className="role-card-top">
                    <div className="role-card-icon">{r.icon}</div>
                    <span className="role-card-badge">{r.badge}</span>
                  </div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  <div className="role-card-footer">
                    <span>{r.metrics}</span>
                    <span className="role-launch-btn">
                      {r.cta} <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE SAFEGUARDS */}
      <section className="landing-section dark-alt" id="safeguards">
        <div className="section-header">
          <span className="section-eyebrow">
            <ShieldCheck size={15} /> WHY SCARAP_YUKTI
          </span>
          <h2>Practical Safeguards Built Into Every Listing</h2>
          <p>
            Informal scrap trading leaks personal numbers and lacks weight accountability. Scarap_Yukti structures each handover step cleanly.
          </p>
        </div>

        <div className="solution-features-grid">
          <div className="solution-feature-box">
            <div className="feature-icon"><Lock size={20} /></div>
            <h4>Privacy Before Acceptance</h4>
            <p>
              Phone numbers, email addresses, and exact house numbers are automatically blocked in public listings so you only share pickup areas up front.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><Scale size={20} /></div>
            <h4>Weight Discrepancy Checks</h4>
            <p>
              Receiving weights entered at facility intake are compared against declared weights. Large differences (&gt;10%) flag the lot for admin review.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><Package size={20} /></div>
            <h4>Locked Terms After Bidding</h4>
            <p>
              Once a lot receives an offer or moves into pickup coordination, weight and material specifications lock to prevent silent edits after agreement.
            </p>
          </div>

          <div className="solution-feature-box">
            <div className="feature-icon"><ShieldAlert size={20} /></div>
            <h4>Honest Prototype Boundaries</h4>
            <p>
              Demo records stay local to your browser tab. Live payment settlement, image uploads, and hardware scales are clearly marked as not yet connected.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SIGNATURE PHYSICAL JOURNEY CIRCUIT */}
      <div id="workflow">
        <PhysicalJourneyNarrative onLaunchDemo={onLaunchDemo} />
      </div>

      {/* 5. ROLE ECOSYSTEM OVERVIEW */}
      <section className="landing-section dark-alt" id="roles">
        <div className="section-header">
          <span className="section-eyebrow">
            <Truck size={15} /> BUILT FOR EVERY PARTICIPANT
          </span>
          <h2>Clear Responsibilities Across All Four Roles</h2>
          <p>
            Each participant sees only the actions and records relevant to their part of the recycling chain.
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
                <strong>Key Safeguard:</strong> {r.metrics}
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

      {/* 6. WEIGHT VARIANCE MODEL & COMPARISON */}
      <section className="landing-section" id="compliance">
        <div className="section-header">
          <span className="section-eyebrow">
            <Scale size={15} /> WEIGHT RECONCILIATION GUIDE
          </span>
          <h2>Configurable Discrepancy Thresholds</h2>
          <p>
            Electronic scrap can lose moisture or packaging tare during transit. Explore how category-level tolerance thresholds help flag abnormal loss.
          </p>
        </div>

        <div className="inline-hint tolerance-disclaimer-banner">
          <ShieldAlert size={16} className="text-amber" />
          <span>
            <strong>Illustrative Model Notice:</strong> The tolerance percentages below (1.5%–5.0%) are reference settings for demonstration. Active workspace lot checks flag differences above 10%, and binding commercial tolerances depend on facility contracts and SPCB rules.
          </span>
        </div>

        <MaterialCalculatorWidget onLaunchDemo={onLaunchDemo} />

        <div className="tolerance-table-wrap">
          <table className="tolerance-table">
            <thead>
              <tr>
                <th>MATERIAL CATEGORY</th>
                <th>REFERENCE CODE</th>
                <th>MODEL THRESHOLD</th>
                <th>PRACTICAL REASON</th>
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

        <div className="differentiator-table-wrap" id="differentiators" style={{ marginTop: "48px" }}>
          <table className="differentiator-table">
            <thead>
              <tr>
                <th>WHAT CHANGES</th>
                <th>INFORMAL DEALERS</th>
                <th>GENERIC CLASSIFIEDS</th>
                <th className="highlight-col">SCARAP_YUKTI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Phone & Address Privacy</strong></td>
                <td><span className="matrix-cross">✕</span> Shared openly with middlemen</td>
                <td><span className="matrix-cross">✕</span> Numbers scraped from ads</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>Area-only public listings</strong> (contact details blocked)</td>
              </tr>
              <tr>
                <td><strong>Offer Discipline</strong></td>
                <td><span className="matrix-cross">✕</span> Verbal quotes changed on pickup</td>
                <td><span className="matrix-cross">✕</span> Duplicate spam inquiries</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>1 pending bid per recycler</strong> + locked specs once offered</td>
              </tr>
              <tr>
                <td><strong>Custody & Weight Log</strong></td>
                <td><span className="matrix-cross">✕</span> No documented history</td>
                <td><span className="matrix-cross">✕</span> Stops after phone call</td>
                <td className="highlight-col"><span className="matrix-check">✓</span> <strong>Receiving weight vs declared comparison</strong> & CSV log</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="landing-section dark-alt" id="faq">
        <div className="section-header">
          <span className="section-eyebrow">
            <Info size={15} /> COMMON QUESTIONS
          </span>
          <h2>Frequently Asked Questions</h2>
          <p>
            Straightforward answers on how privacy, bidding, pickup coordination, and prototype boundaries work.
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

      {/* 8. HONEST CONTACT & AVAILABILITY NOTICE */}
      <section className="landing-section" id="contact">
        <div className="section-header">
          <span className="section-eyebrow">
            <Mail size={15} /> PILOT AVAILABILITY & LIMITATIONS
          </span>
          <h2>Evaluating Scarap_Yukti Today</h2>
          <p>
            Clear scope of what works in your browser right now and what requires backend or external service integration.
          </p>
        </div>

        <div className="contact-layout-box">
          <div className="contact-info-panel">
            <h3>What Works Right Now</h3>
            <p>
              You can test full Seller, Collector, Recycler, and Admin workflows locally in Demo Mode—including privacy rules, offer decisions, pickup scheduling, receiving weight entry, dispute holds, and CSV export.
            </p>
            <div className="contact-meta-items">
              <div className="contact-meta-row">
                <CheckCircle2 size={18} className="text-lime" />
                <span>Browser-isolated demo saves changes only to your current tab</span>
              </div>
              <div className="contact-meta-row">
                <CheckCircle2 size={18} className="text-lime" />
                <span>Role-separated accounts available when connected</span>
              </div>
              <div className="contact-meta-row">
                <Check size={18} className="text-lime" />
                <span>Instant reset to sample records at any time</span>
              </div>
            </div>
          </div>

          <div className="contact-form-panel">
            <div className="contact-unavailable-box" role="status">
              <div className="unavailable-badge-row">
                <ShieldAlert size={20} className="text-amber" />
                <strong>Online Inquiry Form Unavailable</strong>
              </div>
              <p>
                Direct email delivery and inquiry ticketing are not connected in this prototype release. Rather than accepting a form without saving your message, we have disabled inquiry submission here.
              </p>
              <p className="unavailable-secondary">
                <strong>Not yet connected in this version:</strong> Payment/UPI settlement, photo uploads, live spot scrap pricing, hardware weighbridge APIs, and statutory Form-6 PDF generation.
              </p>
              <div className="unavailable-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onLaunchDemo("Seller")}
                >
                  <Zap size={16} /> Open Interactive Demo
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={onSignIn}
                >
                  Sign In to Existing Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CLEAN FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="footer-logo">
                <Recycle size={22} className="text-lime" />
                <strong>Scarap_Yukti</strong>
              </div>
              <p>
                Structured e-waste listing, collection, bidding, and custody tracking prototype aligned with Indian E-Waste (Management) Rules 2022 concepts.
              </p>
            </div>

            <div className="footer-nav-col">
              <h4>EXPLORE</h4>
              <a href="#hero">Overview</a>
              <a href="#safeguards">Safeguards</a>
              <a href="#journey">How It Works</a>
              <a href="#compliance">Weight Rules</a>
            </div>

            <div className="footer-nav-col">
              <h4>WORKSPACES</h4>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Seller")}>Seller Demo</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Collector")}>Collector Demo</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Recycler")}>Recycler Demo</button>
              <button type="button" className="footer-link-btn" onClick={() => onLaunchDemo("Admin")}>Admin Demo</button>
            </div>

            <div className="footer-nav-col">
              <h4>ACCESS</h4>
              <a href="#faq">FAQ</a>
              <a href="#contact">Availability</a>
              <button type="button" className="footer-link-btn" onClick={onSignIn}>Sign In</button>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span>Prototype Environment · Browser Demo & Live Account Mode · No Payment or Hardware Integration</span>
            <small>© 2026 Scarap_Yukti. Built for transparent e-waste logistics.</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
