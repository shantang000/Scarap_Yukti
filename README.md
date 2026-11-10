# Scarap_Yukti (स्क्रैप युक्ति) — Circular E-Waste Logistics Platform

[![Node.js CI](https://img.shields.io/badge/Node.js-20.x%20%7C%2022.x-brightgreen.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.5-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WCAG 2.1](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AAA%2FAA-success.svg)](https://www.w3.org/WAI/WCAG21/quickref/)

**An industrial technology platform prototype and marketplace connecting Electronic Scrap Generators (Sellers), Aggregators (Collectors), and Registered Recyclers with verified custody tracking, mass-balance discrepancy evaluation, and statutory audit logging.**

- **Live Deployment**: [scarap-yukti.vercel.app](https://scarap-yukti.vercel.app/)
- **Repository**: [shantang000/Scarap_Yukti](https://github.com/shantang000/Scarap_Yukti)

---

## Table of Contents
1. [Platform Architecture & Visual Design](#platform-architecture--visual-design)
2. [Workspaces & Participant Roles](#workspaces--participant-roles)
3. [Public Interactive Demo Mode](#public-interactive-demo-mode)
4. [Local Setup & Installation](#local-setup--installation)
5. [Database Migrations & Supabase Architecture](#database-migrations--supabase-architecture)
6. [Testing & Quality Assurance](#testing--quality-assurance)
7. [Deployment Guide (GitHub & Vercel)](#deployment-guide-github--vercel)
8. [Known Limitations & Prototype Boundaries](#known-limitations--prototype-boundaries)
9. [Release Notes & Version History](#release-notes--version-history)

---

## Platform Architecture & Visual Design

Scarap_Yukti combines a high-performance frontend with enterprise-grade dark graphite and high-contrast light industrial aesthetics:

- **Frontend Core**: React 19, Vite 8, Lucide React icons, Canvas-based circular lifecycle visualization.
- **Cinematic Landing Experience**: Authentic 1080p documentary video montage (`scarap-hero.mp4`, 24fps progressive, video-only stream with `scarap-hero-poster.webp` fallback), animated circular flows, interactive mass-balance tolerance calculator, and statutory journey narratives.
- **Accessibility & Design System**: 
  - WAI-ARIA compliant keyboard navigation (`ArrowDown`/`ArrowUp`, `Enter`, `Escape` focus restoration to triggers).
  - WCAG 2.1 AAA color contrast ratios across dark canvas (`#090b0e`, 17.9:1 text, 9.97:1 accent) and light theme (`#ffffff`, 17.06:1 text, 4.99:1 accent).
  - Strict motion accessibility respecting `prefers-reduced-motion: reduce`.
  - Responsive engineering across 360px small mobile, 390px mobile, 768px tablet, 1024px laptop, and 1440px+ desktop viewports with 0px horizontal overflow.

---

## Workspaces & Participant Roles

Scarap_Yukti provides four dedicated operational workspaces with distinct data models, navigation links, and action gating:

| Role | Operational Scope | Key Capabilities |
| :--- | :--- | :--- |
| **Seller** *(Generator)* | Industrial enterprises, corporate IT departments, and bulk scrap generators | Create commercial scrap lots; specify category, condition, location; review incoming collector bids; accept/reject offers; track custody transfer. |
| **Collector** *(Aggregator)* | Authorized local e-waste aggregators and logistics partners | Discover upstream seller scrap; place collection bids; manage downstream lot listings; propose pickup appointment windows; coordinate transport. |
| **Recycler** *(Dismantler)* | Authorized recycling and extraction facilities | Discover aggregated bulk lots; place purchase offers; confirm pickup schedules; record facility receiving net weighbridge readings; trigger mass-balance discrepancy checks. |
| **Admin** *(Auditor)* | Platform compliance supervisors and transaction auditors | Supervise circular chain custody; monitor automated tolerance flags; arbitrate physical weight disputes; advance lots through verified recycling stages (`collected` → `recycling_review` → `recycled`). |

---

## Public Interactive Demo Mode

Scarap_Yukti features a fully functional, zero-friction **Public Demo Mode** for evaluators and hackathon judges:

- **Instant Entry**: Access all four workspaces directly from the landing page via "Try Interactive Demo" without user registration, credentials, or shared accounts.
- **Role Switching**: Switch instantly between Seller, Collector, Recycler, and Admin using the accessible header switcher (`#demo/seller`, `#demo/collector`, `#demo/recycler`, `#demo/admin`).
- **Tab-Isolated Sandboxing**: Demo mutations are persisted using `sessionStorage` under `scarap_yukti_demo_state_v2`. Every browser tab operates in its own isolated memory space. Creating or updating lots in Tab 1 never leaks to Tab 2.
- **Pristine Reset**: Click "Reset Demo" at any time to reseed the sandbox with realistic industrial scrap lots, pending offers, appointments, and audit events.
- **Network Isolation**: All demo actions run locally within the browser; no mutations, RPCs, or writes are dispatched to remote Supabase tables.

---

## Local Setup & Installation

### Prerequisites
- **Node.js**: `20.19+` (Node 20 LTS) or `22.12+` (Node 22 LTS)
- **Package Manager**: `npm` (v10+)
- **Git**

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shantang000/Scarap_Yukti.git
   cd Scarap_Yukti/Scarap_Yukti-Ready
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase project parameters:
   ```dotenv
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```
   > [!IMPORTANT]
   > Use only the **publishable** (anon) key in browser code. Never place secret service-role keys in `.env.local` or frontend source files. `.env.local` is ignored by Git.

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Production Build & Preview**:
   ```bash
   npm run build
   npm run preview
   ```

---

## Database Migrations & Supabase Architecture

All SQL migrations reside in `supabase/migrations/` and enforce Row Level Security (RLS), security-definer RPCs, role constraints, and privacy regex triggers:

1. `20261023000000_marketplace_schema_and_rls.sql`
   - Core tables: `profiles`, `lots`, `offers`, `workflow_events`, `activity_history`.
   - Row Level Security policies, automated profile triggers, and `advance_lot_workflow` RPC.
2. `20261025000000_profile_privacy_lookup.sql`
   - Self-profile read policies and restricted `get_marketplace_profiles` RPC returning minimal participant data.
3. `20261027000000_traceability_hardening.sql`
   - Recycler intake weighing fields, automated 10% discrepancy flags, and participant dispute RPCs.
4. `20261028000000_pickup_appointment_coordination.sql`
   - `pickup_appointments` table, RLS coordination policies, and time window validation.
5. `20261102000000_seller_role_support.sql`
   - Adds the `seller` role to profile check constraints; expands lot creation and offer evaluation authorization to Sellers.
6. `20261102010000_listing_privacy_enforcement.sql`
   - Database-level regex trigger sanitization rejecting 10-digit phone numbers, emails, and residential addresses in listing titles, notes, and locations.

> [!WARNING]
> Migrations are schema migration files intended for controlled manual application. Never rerun already applied migrations against a production Supabase instance.

---

## Testing & Quality Assurance

The codebase includes an automated test harness covering security contracts, data validation, responsive layouts, and UI accessibility:

```bash
# Run full automated test suite (86 passing tests)
npm test

# Run security & authorization contract tests
npm run test:security
```

### Quality Verification Checklist
- **Unit & Contract Tests**: 86/86 passing (`node --test`) covering lot privacy regex, appointment boundaries, role action gating, and state transitions.
- **Production Build**: Clean Vite production bundle in `dist/` with zero module resolution warnings or CSS errors.
- **Headless Browser QA**: Dual-tab CDP browser automation verifying tab-isolated demo sandboxing, keyboard navigation, focus restoration, zero console errors, and 0px horizontal overflow across all 30 viewport configurations.

---

## Deployment Guide (GitHub & Vercel)

### 1. GitHub Repository Push
Ensure your working tree is clean and push changes to your remote repository:
```bash
git checkout -b release/v1.0.0
git add .
git commit -m "chore: release candidate v1.0.0 hardening"
git push origin release/v1.0.0
```

### 2. Vercel Deployment Settings
1. Log in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
2. Import the `Scarap_Yukti` repository (root directory: `Scarap_Yukti-Ready`).
3. Configure the Project Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `your-anon-publishable-key`
5. Click **Deploy**.

### 3. Supabase Auth Configuration
Once deployed, update your Supabase project settings:
1. Navigate to **Authentication → URL Configuration**.
2. Set **Site URL** to your production Vercel URL (e.g. `https://scarap-yukti.vercel.app`).
3. Add redirect URLs:
   - `https://scarap-yukti.vercel.app/**`
   - `http://localhost:5173/**` (for local development)

---

## Known Limitations & Prototype Boundaries

To maintain strict product integrity, evaluators should note the following prototype parameters:
- **Offline Mass-Balance**: The material calculator and weighbridge variance checks model statutory Schedule I tolerances for prototype evaluation. In live commercial operations, legally binding thresholds depend on State Pollution Control Board (SPCB) permits and bilateral processing contracts.
- **Physical Custody Proof**: Admin recycling review notes and timeline checkpoints represent database audit events; they do not replace physical bill-of-lading receipts or laboratory assay certificates.
- **Financial Settlements**: The platform simulates offer negotiation, mass-balance tolerance validation, and payout unlocking. Live banking payment gateway integrations (Razorpay/Stripe) are not active in this release.
- **Identity Verification**: User registration assigns standard collector/seller permissions; commercial GSTIN and authorized recycler dismantler licenses must be vetted by platform administrators prior to privileged role assignment.

---

## Release Notes & Version History

### Version 1.0.0 — Release Candidate (November 2026)
- **Phase 1**: Core marketplace implementation, distinct Seller/Collector views, lot creation modals, and action gating.
- **Phase 2**: Real-time Postgres Changes subscription coalescing, appointment proposal rescheduling, and timeline status pipelines.
- **Phase 3**: Cinematic frontend transformation, 1080p hero documentary montage, interactive Schedule I material calculator, circular flow canvas animation, and dual dark/light themes.
- **Phase 4**: Public Demo Mode, tab-isolated `sessionStorage` sandboxing, WAI-ARIA keyboard focus management, WCAG 2.1 AAA contrast compliance, 0px mobile viewport overflow remediation, and honest claims hardening.

---

**Built with pride for responsible e-waste circularity.**
