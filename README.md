# Scarap_Yukti

Scarap_Yukti is a React + Vite e-waste marketplace demo with separate Collector, Recycler, and Admin dashboards. Supabase authentication and marketplace workflows are connected for signed-in users. The signed-out demo is stored only in this browser.

## Requirements

- Node.js 20.19+ (20.x) or 22.12+.
- npm.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from your Supabase project. Use only the publishable key in this browser app. Never put a Secret/service-role key in a `VITE_` variable.
4. In Supabase Authentication, enable the Email provider and add your local app URL (usually `http://localhost:5173/**`) to the allowed redirect URLs. Set the Site URL as appropriate. Email confirmation may be required by your Auth settings.
5. Start the app: `npm run dev`

After changing environment variables, restart Vite. `.env.local` is ignored by Git. Password recovery returns to the app's current origin, which must also be allowed in Supabase redirect URLs.

## Database setup

The checked-in migrations are ordered as follows:

1. `supabase/migrations/20261023000000_marketplace_schema_and_rls.sql` creates profiles, lots, offers, workflow and activity history, RLS policies, triggers, and workflow RPCs.
2. `supabase/migrations/20261025000000_profile_privacy_lookup.sql` restricts profile reads to the user's own row and adds a limited RPC for relevant marketplace display names.

Apply these only through your reviewed Supabase process, in order, on a database that needs them. The project owner reports that both have already been applied to the current project; do not rerun them there. No SQL is run by the frontend or by `npm run build`.

New Auth users receive the Collector role from the database profile trigger. The browser reads the role from that user's `profiles` row; the signed-out demo role selector only switches local demo screens and grants no database permissions. Assigning Recycler or Admin roles requires a trusted project-operator process outside this UI.

## Test the dashboards

- **Signed-out demo:** choose Collector, Recycler, or Admin from the role selector. Create sample lots, submit demo offers, make demo decisions, and preview workflow actions. This data stays in this browser's `localStorage` and is not shared across users or devices.
- **Collector account:** create a lot and accept or reject pending offers on lots owned by the account. Decisions use `respond_to_offer(p_offer_id, p_decision)` and the database checks ownership and status.
- **Recycler account:** browse lots available for offers and submit one offer per lot. The database checks the role, eligibility, and duplicate constraint.
- **Admin account:** monitor marketplace records and advance permitted workflow steps through `advance_lot_workflow(p_lot_id, p_next_status, p_note)`. The database checks the Admin profile role, transitions, and evidence-note length.

For connected testing, use separate accounts whose database profile roles were assigned by a trusted operator. A successful frontend build does not verify live sign-in, RLS, RPC behavior, or database connectivity; test those flows in the browser and confirm records/statuses in Supabase.

## Build and local preview

```powershell
npm.cmd run build
npm.cmd run preview
```

The production files are written to `dist/`.

## Deploy a static build

1. Configure the hosting provider's build command as `npm.cmd run build` on Windows or `npm run build` on Linux/macOS, and its publish/output directory as `dist`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time environment variables in the hosting provider. These are browser-visible configuration values; do not add a service-role key.
3. Build and publish `dist/` using the provider's normal deployment process. This repository does not configure or perform deployment.
4. In Supabase Authentication URL Configuration, set the deployed app as the Site URL and add its exact origin and recovery redirect path to allowed Redirect URLs. Keep the local URL there too if you still test locally.
5. Open the deployed site and manually verify sign-in, each role's expected workflow, password recovery, and RLS/RPC outcomes.

Configure the host to serve the app entry point for the recovery URL path if it does not already support single-page application routes.

## Current limitations

- Signed-out demo records and transitions are local simulations. They are not shared, authenticated, or protected by database policies.
- Database role checks and workflow permissions are enforced by the deployed RLS policies and RPCs; the UI role display alone is not a security boundary. This source review does not independently verify the current hosted configuration.
- An Admin's evidence/review note is text stored with the workflow. It does not prove that pickup or physical recycling occurred.
- The app does not verify recycler businesses or independently verify collection/recycling, coordinate pickup, process payments, or provide a dispute-resolution service.
- No automated test script is configured in `package.json`; use the build check and manual workflow steps above.
