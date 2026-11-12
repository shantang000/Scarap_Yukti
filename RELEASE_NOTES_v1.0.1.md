# Scarap_Yukti — Release Notes v1.0.1

**Release Version:** `v1.0.1`
**Previous Release:** `v1.0.0` (`506eab8`)
**Workspace:** `Scarap_Yukti-Ready`
**Repository:** `shantang000/Scarap_Yukti`
**Branch:** `main`
**Date:** November 2026

---

## 1. Executive Summary

Release `v1.0.1` delivers a comprehensive human-centered product upgrade to the Scarap_Yukti electronic scrap marketplace. This release resolves critical usability, accessibility, layout, and visual defects discovered during independent human validation (Phase 1.5).

Key outcomes:
- **Developer Jargon Purged:** Removed developer test count badges, database triggers/RPC terminology, and internal framework jargon from user-facing screens.
- **Privacy & Field Validation Upgrades:** Introduced upfront privacy guidance, inline field-targeted error rendering with accessible focus management, and automatic conversion between Kilograms (`kg`) and Metric Tonnes (`MT`).
- **Modal Safety:** Integrated unsaved-changes discard confirmation dialogs (`role="alertdialog"`) across all workspace forms.
- **Role Differentiation:** Distinct, tailored workflows across all four marketplace roles (Seller, Collector, Recycler, Admin) with honest operational boundaries.
- **Mobile Responsive Header Correction (Phase 2.2):** Compact responsive breadcrumbs on screens `≤ 480px`, eliminating the 47px breadcrumb clipping defect while preserving the full desktop breadcrumb structure.
- **Spreadsheet Security:** Exported CSV files now enforce RFC-4180 compliance and neutralize spreadsheet formula injection vulnerabilities.

---

## 2. Key Enhancements & Features

### A. Public Landing Page & Auth Portal
- **Streamlined Architecture:** Consolidated from 16 sprawling sections down to 7 focused, scannable product sections (`Safeguards`, `How It Works`, `Roles`, `Weight Rules`, `FAQ`, `Availability`, `Demo`).
- **Honest Availability:** Replaced mock client-side contact inquiries with an explicit *Online Inquiry Form Unavailable* status panel matching backend reality.
- **Media Optimization:** Hero `<video>` is lazy-loaded on desktop only, respects `prefers-reduced-motion: reduce`, and provides a dedicated fallback poster (`scarap-hero-poster.webp`).
- **Auth Clarity:** Clean vertical layout eliminating control overlapping in both dark and light themes.

### B. Form Usability, Units & Privacy Validation
- **Unit Conversion Helper (`src/lib/quantityUnits.js`):** Lossless, bounded conversions between `kg` and Metric Tonnes (`0.1 kg` to `100,000 kg` / `100 MT`).
- **Shared Accessible Form (`src/components/LotFormFields.jsx`):** Unit pill switchers with dynamic `"Stored as ... kg"` helper text, character counters, and upfront privacy callouts.
- **Inline Error Feedback (`src/lib/lotFormValidation.js`):** Replaced alert toasts with inline field-anchored errors (`role="alert"`, `aria-invalid`, `aria-describedby`) and automatic scrolling/focus on submit failure.
- **Unsaved Changes Guard (`src/components/DiscardChangesBanner.jsx`):** Prevents accidental data loss when closing active modal forms.

### C. Workspace Workflows & Role Separation
- **Seller Workspace:** Added contextual *Next Step* guidance card, prioritized incoming recycler offers above timeline records, and scoped summary metrics to Seller-owned lots.
- **Collector Workspace:** Eliminated native `window.alert()` calls; added accessible *Physical Scale Verification Unavailable* explanation modal; implemented 3-way segmented workspace tabs (*Available Pickups*, *Collection Work*, *My Consignments*) with search and category filtering.
- **Recycler Workspace:** Added honest photo-unavailable notices and off-platform payment disclaimers; scoped status filters to open acquisition lots.
- **Admin Workspace:** Restored missing search clear icon (`X`); added *"Needs Attention (N)"* exception filter chip; added inline validation and operational consequence notes on review textareas.

### D. Mobile Header Truncation Fix (Phase 2.2)
- Added semantic `.breadcrumb-brand` and `.breadcrumb-separator` wrappers in `App.jsx`.
- At viewports `≤ 480px`, CSS hides the redundant `"Scarap_Yukti / "` prefix, allocating the full width to the active section title (`My listings`, `Price estimator`, `Overview`).
- Tested and verified at `360px`, `390px`, `412px`, `480px`, `481px`, and `1440px` with `0px` horizontal overflow.

### E. Secure CSV Spreadsheet Exports
- Implemented RFC-4180 quoting and character escaping in `src/lib/exportUtils.js`.
- Automatically neutralizes formula injection by prefixing risky leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes (`'`).
- Explicitly labels data as workspace export records (not statutory Form-6 regulatory certificates).

---

## 3. Automated Verification Summary

- **Frontend Test Suite:** **91 / 91 passed** (`0 fail`, `0 skipped`, `duration_ms 5610.3888`).
- **Security Contracts:** **9 / 9 passed** (`duration_ms 446.9684`).
- **Production Build:** Vite v8.3.5 production client built in **804ms** (`dist/` asset bundle generated cleanly).
- **Linter Check:** `oxlint` not installed in local environment (reported as NOT VERIFIED); syntax validated via Node engine and Vite/Rollup AST compilation.

---

## 4. Operational Boundaries Maintained

- Zero remote Supabase schema changes or migrations executed.
- Client Supabase configuration remains publishable-key only.
- `supabase/review/` directory untouched.
- External capabilities (scale hardware, material photos, payment gateway, Form-6 generation) stated honestly as unavailable.
