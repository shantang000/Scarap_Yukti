# Scarap_Yukti — Release Manifest v1.0.1

**Release Target:** `v1.0.1`
**Base Commit:** `506eab8` (`Release v1.0.0: public interactive demo`)
**Workspace:** `Scarap_Yukti-Ready`
**Total Proposed Files:** **25 files**

---

## 1. Proposed Release Files (Exact 25-File Manifest)

### A. Modified Tracked Source Files (13 files)
1. `src/App.css` — Redesign styling system, touch targets, mobile header compact rules, dark/light theme tokens.
2. `src/App.jsx` — Workflow state management, CSV export integration, breadcrumb semantic wrappers, modal focus management.
3. `src/components/AccessibleMenus.jsx` — Database role copy simplification (`Account type: ...`).
4. `src/components/AdminWorkspaceView.jsx` — Search clear icon fix (`X`), Needs Attention filter chip, dispute validation.
5. `src/components/CircularFlowCanvas.jsx` — Idle animation cancellation via IntersectionObserver, light/dark canvas palettes.
6. `src/components/CollectorWorkspaceView.jsx` — Elimination of `alert()`, 3-way segmented tabs, scale unavailable modal dialog.
7. `src/components/EditLotModal.jsx` — Integration of shared `LotFormFields`, discard changes alert dialog, focus scrolling.
8. `src/components/LandingPage.jsx` — 7-section streamlined landing page, removal of test badges, video lazy loading.
9. `src/components/OperationalSummary.jsx` — Scoped metrics by role, telemetry charts collapsed by default, Recycler count fix.
10. `src/components/PhysicalJourneyNarrative.jsx` — Plain custody language, automated scale hardware disclaimer.
11. `src/components/RecyclerWorkspaceView.jsx` — Photo upload limitation notice, open lot status filter scoping.
12. `src/components/SellerWorkspaceView.jsx` — Contextual next-step guidance card, incoming offers prioritization.
13. `src/components/TraceabilityTimeline.jsx` — Honest self-reported/pending weight copy, Form-6 responsibility clarification.

### B. Modified Tracked Test Files (2 files)
14. `tests/phase1-landing-and-navigation.test.js` — Updated stale UI copy regex assertions.
15. `tests/role-dashboards-differentiation.test.js` — Updated stale UI copy regex assertions.

### C. New Application & Test Files (7 files)
16. `src/components/DiscardChangesBanner.jsx` — Accessible unsaved changes inline confirmation banner (`role="alertdialog"`).
17. `src/components/LotFormFields.jsx` — Shared lot creation/edit form controls with unit pill switch (`kg`/`MT`) and inline errors.
18. `src/lib/exportUtils.js` — RFC-4180 CSV export builder with formula injection neutralization.
19. `src/lib/lotFormValidation.js` — Input validator enforcing bounds (`0.1–100,000 kg`) and privacy rules.
20. `src/lib/quantityUnits.js` — Lossless `kg` ↔ `Metric Tonnes (MT)` conversions.
21. `src/lib/workflowGuidance.js` — Contextual next-step helper across all 7 lot statuses.
22. `tests/phase2-ux-and-utilities.test.js` — Automated regression unit tests for Phase 2 utilities.

### D. Release Documentation Files (3 files)
23. `RELEASE_NOTES_v1.0.1.md` — Detailed feature release notes, UX enhancements, and test evidence.
24. `RELEASE_MANIFEST_v1.0.1.md` — Staging manifest and exclusion boundaries.
25. `RELEASE_BLOCKERS_v1.0.1.md` — Blocker audit, operational limitations, and release gate status.

---

## 2. Excluded Paths & Artifacts (Must NEVER Be Staged)

| Path | Reason for Exclusion |
| :--- | :--- |
| `supabase/review/` | Review SQL migrations, internal contract audits, and review tooling. Not part of client application runtime. |
| `video-production/contact-sheets/` | Intermediate video review contact sheets. |
| `video-production/final-video-qc/` | Intermediate video QC verification frames. |
| `.env*`, `.env.local` | Potential sensitive credentials (already verified clean / publishable-only). |
| `.vercel/` | Local build and deploy caches. |
| `.tmp-chrome*` | Temporary headless browser profiles used during local QA. |
