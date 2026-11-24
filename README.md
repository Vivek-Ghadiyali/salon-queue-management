# Salon Queue Management System

## Project overview

The Salon Queue Management System gives customers a way to join a salon's same-day queue and follow their progress. Reception staff allocate customers to eligible barbers, barbers update their assigned service, and a public display shows tokens without customer contact information.

## Problem statement

Customers may wait without knowing their place or estimated wait. Reception must coordinate walk-ins and multiple barbers manually. This application centralizes the queue and shares status across customer, reception, barber, and waiting-area screens.

## Objectives

- Let customers select one to three services and a barber preference.
- Generate daily sequential queue tokens and estimate waits from service minutes ahead divided by working barbers.
- Give reception and barbers role-specific queue controls.
- Keep customer status private behind a high-entropy status URL.
- Keep the TV display free of customer names and phone numbers.
- Synchronize queue views using Supabase Realtime refresh events and a four-second polling fallback.

## Main features

- Home page with salon details, service menu, barber availability, hours, and online-joining state.
- Join Queue form with name/phone validation, 1–3 unique service choices, barber preference, and duplicate-active-phone protection.
- My Status route with private-link entry, queue progress, service details, barber, estimated wait, cancellation while Waiting, and a copyable private link.
- Reception dashboard for walk-ins, Call Next, waiting cancellation, and no-show/re-add actions.
- Barber workspace for only the signed-in barber's assignment, Start/Done, timer, and break status.
- Owner settings for salon hours, working days, services, prices/durations, barbers, online-joining override, and daily statistics.
- Public TV view for current barber tokens and next tokens only.

## Technology stack

- React + Vite (JavaScript)
- Tailwind CSS 4
- React Router
- `@supabase/supabase-js`
- Supabase PostgreSQL, Auth, and Realtime Broadcast
- Vercel-ready static frontend

## System architecture

The Vite client uses the Supabase publishable key (or legacy anon key). Public customer and TV views call narrowly scoped Postgres RPC functions. Staff authenticate with Supabase Auth; `staff_profiles` supplies the role and optional barber ID. Staff RPCs check that profile before acting. Browser roles have no direct table grants; the tables use RLS with no permissive client policies. No service-role key belongs in the browser.

Queue mutations occur in database functions and write activity logs. Database triggers send a generic Realtime `refresh` event with no row or customer data. Screens reload their permitted RPC snapshots on that event and poll every four seconds as a fallback. Customer status uses a random capability URL; the TV RPC only returns barber names, tokens, and estimates.

## Database overview

The migrations create:

- `salon_settings`
- `services`
- `barbers`
- `staff_profiles`
- `daily_token_counters`
- `queue_entries`
- `queue_entry_services` (service name/duration/price snapshots)
- `queue_activity_logs`

The SQL API covers public salon/TV snapshots, customer join/status/cancel, staff profile/dashboard reads, walk-in registration, Call Next, service transitions, cancellation/no-show/re-add, barber availability, and owner settings/services/barbers. The current migration set is in [`supabase/migrations/`](./supabase/migrations/).

## User roles and permissions

| Role | Access |
| --- | --- |
| Customer | Public salon details, online join, and status from their private URL; no staff account required |
| Receptionist | Staff sign-in; view queue/contact details, add walk-ins, Call Next, cancel Waiting, mark eligible No-show, re-add No-show |
| Barber | Staff sign-in linked to one barber; view only that barber's current/next assignment, Start/Done, set own break status |
| Owner | Staff sign-in; owner settings, services, barbers, and daily statistics; may use reception management |

Staff accounts are created in Supabase Auth and linked to `staff_profiles`. Do not enable public staff sign-up for a live salon.

## Installation and local development

Requirements: Node.js 20.19+ and npm. From the project root:

```sh
npm ci
```

Copy `.env.example` to `.env.local` and add the Supabase project URL and public key, then start Vite:

```sh
npm run dev
```

The other available commands are `npm run build` and `npm run preview`.

## Environment configuration

`.env.example` lists the accepted variables:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
# Legacy alternative if the project only provides an anon key:
VITE_SUPABASE_ANON_KEY=
```

Use either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`. Never use a service-role or secret key as a `VITE_` variable. Vite exposes `VITE_` values to browser code.

## Supabase setup and migrations

Create a Supabase project. The repository already includes `supabase/config.toml`; do not run `supabase init` over the existing configuration. For CLI migration deployment, install and link the CLI:

```sh
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run --remote
npx supabase db push --remote
npx supabase migration list --remote
```

The migrations are applied in timestamp order:

1. `20261124000000_initial_schema.sql`
2. `20261124010000_staff_rpc_security.sql`
3. `20261124020000_prevent_duplicate_service_names.sql`
4. `20261124030000_demo_seed_rpc.sql`
5. `20261124040000_additive_demo_queue_seed.sql`

The fifth migration adds a service-role-only additive demo queue seeder and disables the earlier fresh-database demo seeder. It does not run automatically. Before using the CLI on an existing project, inspect `npx supabase migration list --remote` and the `npx supabase db push --dry-run --remote` output. Apply only when the earlier migrations are already deployed and the dry run shows the intended new migration; stop if other migrations are pending or the migration history does not match the database. See [`supabase/README.md`](./supabase/README.md).

## Demo data setup

The demo seeder adds three clearly labelled `[DEMO]` waiting entries to the existing Supabase project. It preserves all existing salon settings, services, barbers, Auth users, staff profiles, queue records and history. It does not create staff accounts or change passwords. It uses the currently enabled service, the normal token/snapshot helper and the existing queue schema. These entries become visible in the live queue and affect queue counts and estimates, so run it at a suitable time. The seed command uses the already-installed Supabase JavaScript client and Node built-ins; it does not add dependencies.

1. Confirm the additive demo migration is deployed to the existing project.
2. Copy `.env.demo.example` to `.env.demo.local`.
3. Configure these variables in `.env.demo.local` only:

   ```dotenv
   SUPABASE_URL=https://YOUR_EXISTING_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_ONLY_SERVICE_ROLE_KEY
   SALON_DEMO_PROJECT_REF=YOUR_EXISTING_PROJECT_REF
   SALON_DEMO_APP_URL=http://127.0.0.1:5173
   DEMO_SEED_KEY=salon-queue-demo-v1
   DEMO_CUSTOMER_PHONE_1=YOUR_UNUSED_10_DIGIT_TEST_NUMBER
   DEMO_CUSTOMER_PHONE_2=YOUR_UNUSED_10_DIGIT_TEST_NUMBER
   DEMO_CUSTOMER_PHONE_3=YOUR_UNUSED_10_DIGIT_TEST_NUMBER
   ```

   Keep `.env.demo.local` gitignored and never put the service-role key in a `VITE_` variable. Choose three unique, non-real phone numbers that have never appeared in queue history. The database checks this and aborts on any collision.
4. Keep the same `DEMO_SEED_KEY` for reruns.
5. Start the app locally (`npm run dev`) or set the app URL to the configured deployment.
6. Run:

   ```sh
   npm run demo:seed -- --confirm-project YOUR_EXISTING_PROJECT_REF
   ```

7. At the prompt, type `SEED DEMO YOUR_EXISTING_PROJECT_REF` to confirm the target.

The script calls the service-role-only `seed_demo_queue_entries` RPC. The database creates three `[DEMO] Queue Customer` Waiting entries through the shared queue-creation helper, snapshots the first enabled service, allocates normal daily tokens and writes seed activity markers. It refuses to proceed if any selected phone already exists in queue history. Re-running with the same seed key returns the same three entries and does not create duplicates; private status URLs are written to the ignored `.demo-status-links.txt` file. The script never accesses Supabase Auth, prints the service-role key, or changes settings/services/barbers/accounts. Sign in with the existing staff accounts through the Owner, Reception or Barber navigation; no demo credentials are created by this script. Use reception/barber screens to advance demo entries through the normal workflow.

## Deployment preparation

The Vite production build outputs to `dist/`. For Vercel:

1. Import the repository in Vercel after it has been pushed to GitHub by the project owner.
2. Use the project root, build command `npm run build`, and output directory `dist`.
3. Configure `VITE_SUPABASE_URL` plus one public key variable (`VITE_SUPABASE_PUBLISHABLE_KEY` preferred) in Vercel's deployment environment settings.
4. Apply and verify Supabase migrations before enabling the deployment.
5. In Supabase Auth URL configuration, set the deployed site's allowed redirect/site URLs. Keep staff public sign-up disabled.
6. Verify direct route refreshes (`/join`, `/status/<private-link>`, `/admin`, `/barber/<name>`, `/display`) on a Vercel preview deployment.

[`vercel.json`](./vercel.json) supplies the SPA rewrite so React Router routes resolve to `index.html` on direct requests. No live public deployment has been performed by this setup.

## Screenshots

No submission screenshots are included yet. Capture the actual configured demo screens after seeding and reviewing them; do not use fictional preview data as evidence of live database behavior.

## Future scope

The current project stays within the queue workflow. Online payments, future appointments, SMS/WhatsApp, loyalty rewards, and multiple branches are out of scope in the project brief. Any future scope change requires approval.
