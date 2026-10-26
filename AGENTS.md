# Scarap_Yukti coding instructions

## Project context

- This repository is a React + Vite e-waste marketplace using Supabase Auth, database reads, RLS, and workflow RPCs.
- Current npm scripts are `dev`, `build`, `preview`, `test`, and `test:security`. Check `package.json` for the current scripts and dependencies before relying on them.
- The app has Collector, Recycler, and Admin dashboards plus a signed-out, browser-local demo. Preserve these working paths unless the user requests otherwise.

## Before changing files

- Inspect the relevant existing code, configuration, migrations, and documentation before making changes. Check `git status --short` first.
- Explain the concrete issue and intended small change when the user asks for an audit or review before implementation.
- Preserve project structure, working features, and existing user changes. Make focused edits; do not replace the app or discard unrelated work.
- Do not modify, move, delete, or overwrite anything under `supabase/review/`. Leave that directory untouched unless the user explicitly asks for work there.

## Secrets and environment

- Never read or print `.env.local` contents. Do not ask the user to disclose secret values.
- Frontend configuration may use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a Supabase Secret/service-role key or other private credential in frontend code, a `VITE_` variable, logs, or documentation.
- Do not overwrite environment files. Keep `.env.example` limited to clearly marked placeholders.

## Supabase and deployment safety

- Never run a database migration or SQL, alter production Supabase data/settings, change roles, or modify live policies/functions unless the user explicitly approves that specific action.
- Never deploy, publish, or push to GitHub unless the user explicitly asks. Do not perform destructive Git operations (such as reset, clean, or forced push) without explicit approval.
- Do not claim a database change, security property, or deployment succeeded without evidence. Distinguish source review and build results from live Supabase/Vercel verification.
- Keep authorization in database RLS and trusted RPCs. Do not weaken database permissions to make a frontend flow work.

## Implementation and checks

- Use existing dependencies and project patterns. Do not install packages unless genuinely needed; explain why before installing.
- Run the available build and test scripts that are relevant and safe. Fix errors introduced by your changes. If no test script exists, say so instead of implying tests ran.
- Do not ask the user to copy code or terminal output when the repository and available tools let you inspect or run the check directly.
- Preserve honest UI and documentation: demo-only behavior, local-only data, evidence notes, and unverified real-world activity must be labeled accurately.

## Completion report

- Name every file changed and summarize what changed and why.
- Report the exact checks run and whether they passed; include warnings and failures separately.
- State remaining limitations and manual setup needed. Never claim production readiness based only on a successful build or a polished interface.
