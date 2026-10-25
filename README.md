# Scarap_Yukti

**An e-waste marketplace demo connecting Collectors and Recyclers, with an Admin workflow for tracking recycling progress.**

- Live website: [scarap-yukti.vercel.app](https://scarap-yukti.vercel.app/)
- GitHub: [shantang000/Scarap_Yukti](https://github.com/shantang000/Scarap_Yukti)

Scarap_Yukti is built with React, Vite, and Supabase. It provides separate Collector, Recycler, and Admin dashboards. Signed-in marketplace data is stored in Supabase and accessed under the project's Row Level Security (RLS) policies. The signed-out demo is saved only in the current browser.

## Features

- **Collector:** create e-waste lots, view incoming Recycler offers, and accept or reject pending offers for owned lots.
- **Recycler:** browse available lots and submit an offer. The database permits one offer per Recycler per lot.
- **Admin:** monitor marketplace records and advance allowed workflow steps through a database RPC.
- **Workflow history:** track offer decisions, pickup scheduling, collection, recycling review, and recycled status.
- **Authentication:** sign up, sign in, sign out, and recover a password with Supabase Auth. The dashboard role is read from the user's database profile.
- **Profile privacy:** direct profile reads are limited to the user's own profile; a restricted database function returns participant names only for relevant visible marketplace records.

The project owner reports testing this connected workflow: Collector creates a lot → Recycler submits an offer → Collector accepts it → Admin advances it through `pickup_scheduled`, `collected`, `recycling_review`, and `recycled`. The final status remained after refreshing. A successful build alone does not verify live Supabase behavior.

## Local setup

### Requirements

- Node.js 20.19+ (20.x) or 22.12+.
- npm.

### Install and run

1. Clone the repository and open its project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`.
4. Set these values in `.env.local` using your Supabase project settings:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Use only the Supabase publishable key in this browser app. Never put a Secret or service-role key in a `VITE_` variable or frontend code. `.env.local` is ignored by Git; do not commit it.

5. In Supabase Authentication settings, enable the Email provider. Add `http://localhost:5173/**` to allowed redirect URLs and configure the Site URL as appropriate. Password recovery redirects to the app's current origin, which must also be allowed. Email confirmation may be required by your Auth settings.
6. Start Vite:

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite, usually `http://localhost:5173`.

Restart Vite after changing environment variables.

## Supabase database setup

The migrations in `supabase/migrations/` are intended to be applied in this order:

1. `20261023000000_marketplace_schema_and_rls.sql` — marketplace tables, constraints, RLS policies, triggers, and workflow RPCs.
2. `20261025000000_profile_privacy_lookup.sql` — own-profile read policy and the limited marketplace participant-name lookup function.

These are schema migrations, not scripts to rerun casually. Before applying them to an existing Supabase project, check its migration history and actual schema. The project owner reports that both have already been applied to the current project; do not reapply them there. For a fresh project, review the SQL and test it on a disposable database before applying it to a main project. This repository and its build do not run SQL against Supabase.

New Auth users receive the `collector` role from the database profile trigger. The app does not let users select or promote their database role. A trusted project operator must provision `recycler` and `admin` roles through an appropriate protected process. The signed-out role selector only switches between local demo dashboards.

## Try the dashboards

### Connected workflow

Use separate signed-in accounts with the required database roles. Verify the account's profile role through the trusted Supabase administration process; do not rely on the UI selector for permissions.

1. Sign in as a Collector and create a lot.
2. Sign in as a Recycler and submit an offer to that lot.
3. Sign back in as the lot-owning Collector and accept or reject the pending offer.
4. Sign in as an Admin and advance the accepted lot through collection and recycling review to `recycled`.
5. Refresh the page and confirm the status persisted. Check the corresponding records in Supabase.

The app calls `respond_to_offer` for Collector decisions and `advance_lot_workflow` for Admin workflow actions. The database functions and RLS policies are intended to enforce permissions and valid transitions; frontend visibility checks are not a security boundary.

### Local demo mode

When signed out, select Collector, Recycler, or Admin to preview the dashboards and simulated workflow. Demo records are stored in this browser's `localStorage`. They are not authenticated, shared with other users, or protected by database RLS.

## Build and preview

```bash
npm run build
npm run preview
```

Vite writes the production site to `dist/`.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Set the build command to `npm run build` and the output directory to `dist` (Vercel usually detects Vite automatically).
3. In Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables for the environments you use. Do not add a service-role key.
4. Build and deploy with Vercel. Add the deployed site origin and password-recovery redirect URL to Supabase Authentication's allowed Redirect URLs, and set the Site URL to the deployed site.
5. Manually test sign-in, password recovery, each role's allowed actions, and refresh persistence on the deployed site.

## Limitations

- The Admin evidence/review note is text recorded in the database. It does not independently prove that pickup or physical recycling occurred.
- The app does not verify Collector or Recycler identity/business licenses, arrange physical pickup, process payments, or certify recycling.
- Connected behavior depends on the Supabase project having the expected migrations, RLS policies, RPCs, and Auth URL configuration. This README does not independently verify current hosted settings.
- No automated test script is configured in `package.json`; use the build command and manually test the connected workflow.
