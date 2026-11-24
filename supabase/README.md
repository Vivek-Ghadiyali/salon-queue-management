# Supabase setup

The schema and API are installed by five ordered migrations: [`20261124000000_initial_schema.sql`](./migrations/20261124000000_initial_schema.sql), [`20261124010000_staff_rpc_security.sql`](./migrations/20261124010000_staff_rpc_security.sql), [`20261124020000_prevent_duplicate_service_names.sql`](./migrations/20261124020000_prevent_duplicate_service_names.sql), [`20261124030000_demo_seed_rpc.sql`](./migrations/20261124030000_demo_seed_rpc.sql), and [`20261124040000_additive_demo_queue_seed.sql`](./migrations/20261124040000_additive_demo_queue_seed.sql). The follow-up migrations harden staff RPC permissions, prevent new duplicate service names, and add an additive service-role-only demo seeder. Migrations do not insert demo records or credentials.

## 1. Create and link a Supabase project

Create a Supabase project, then install the CLI in this project and link the repository folder to the project:

```sh
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

The project reference is visible in the Supabase dashboard URL. This folder already has `supabase/config.toml` and the migration directory, so do not run `supabase init` over them.

This project already has salon data. Do not apply the initial schema migration blindly to a project whose existing migration history is unknown. Check the remote migration list first and compare it with the deployed schema. The latest demo migration adds only a restricted RPC and revokes the previous fresh-database demo RPC; it does not modify existing salon records.

Review migration history and pending changes before applying anything:

```sh
npx supabase db push --dry-run --remote
npx supabase migration list --remote
```

If the earlier schema/security migrations are already recorded and the dry run shows only `20261124040000_additive_demo_queue_seed.sql`, apply it with `npx supabase db push --remote`, then check `npx supabase migration list --remote` again. Stop if the dry run includes earlier migrations or shows a mismatch; reconcile migration history/schema before pushing to this existing project. Do not run a blind full migration push against the live database.

Supabase documents `db push --remote` as applying local migrations to the linked remote project; it records the migration in the remote migration history. See the [Supabase migration guide](https://supabase.com/docs/guides/local-development/database-migrations) and [CLI reference](https://supabase.com/docs/reference/cli/supabase-config#supabase-db-push).

For a reviewed existing project, the SQL Editor alternative is to run only the new fifth migration after confirming the first four are already represented in the live schema. The SQL Editor path does not add CLI migration-history records, so use one workflow consistently for future migrations.

## 2. Configure the frontend

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
# Or use the legacy key name if the project only provides an anon key:
VITE_SUPABASE_ANON_KEY=
```

Use the project's publishable key (preferred) or legacy anon key. **Never put the service-role or secret key in a `VITE_` variable or frontend code.** The client only uses the public key; database RPC permissions and staff roles protect operations. Supabase explains that secret/service-role keys bypass RLS in its [security documentation](https://supabase.com/docs/guides/database/secure-data).

Restart the Vite process after changing environment variables:

```sh
npm run dev
```

Set the same two environment variables in the Vercel project before deploying.

## 3. Create the first owner account

1. In Supabase Dashboard → Authentication → Users, create an owner user with email and password. Disable public sign-up if it is enabled; staff accounts should be created by the project owner.
2. Copy that user's UUID and run this in the SQL Editor, replacing the example values:

```sql
insert into public.staff_profiles (user_id, role, display_name)
values ('AUTH_USER_UUID', 'owner', 'Salon Owner');
```

3. Sign in at `/admin`. Add the salon services and barbers, then update the salon name, address, hours and working days.
4. Create reception users in Authentication, then link each user:

```sql
insert into public.staff_profiles (user_id, role, display_name)
values ('AUTH_USER_UUID', 'receptionist', 'Reception');
```

5. Add the barber in Owner Settings, copy the resulting barber UUID from the `barbers` table in the Dashboard, create their Auth user, then link the account:

```sql
insert into public.staff_profiles (user_id, role, barber_id, display_name)
values ('AUTH_USER_UUID', 'barber', 'BARBER_UUID', 'Barber Name');
```

Staff screens require an authenticated account with a matching `staff_profiles` role. Reception/owner access is required for walk-ins, calling, cancellations and no-shows. Only the linked barber can start/complete their assigned entry or update their break status; barber accounts cannot read the reception queue or another barber's assignment.

## Database and API notes

- `salon_settings`, `services`, `barbers`, `staff_profiles`, `daily_token_counters`, `queue_entries`, `queue_entry_services`, and `queue_activity_logs` are created with RLS enabled.
- Browser roles have no direct table grants. They use narrowly scoped `SECURITY DEFINER` RPC functions. The RPCs validate roles, statuses, service counts and active assignments.
- Staff RPC execution is granted only to `authenticated`; staff roles are then checked against `staff_profiles` inside each function. Public/customer RPCs are the only routines granted to `anon`.
- No direct table policies are defined. RLS is enabled and table/sequence privileges are revoked from `PUBLIC`, `anon`, and `authenticated`; access is through the explicit RPC surface.
- Customer status links contain a 256-bit random capability token. Keep the URL private. The database returns customer status only through `get_customer_status(token)` and never exposes queue tables directly.
- The TV RPC returns barber names, current/upcoming tokens, and estimates only. It does not return customer names or phone numbers.
- Queue changes publish a generic `refresh` broadcast with no customer or row data. Screens reload their allowed RPC snapshot on the broadcast and poll every four seconds as a fallback. Supabase Broadcast uses `realtime.send(payload, event, topic, private)`; see [Broadcast from the database](https://supabase.com/docs/guides/realtime/broadcast).
- Wait estimates follow the documented approximation: remaining service minutes ahead divided by on-duty, not-on-break barbers, rounded up when work remains. It is not an appointment guarantee.
- Salon timezone defaults to `Asia/Kolkata`, currency to `INR`. Online joining respects salon working days/hours, a manual close, and the 30-minute pre-close cutoff.

## RPCs used by the frontend

Public: `get_public_salon_snapshot`, `get_public_tv_snapshot`, `customer_join_queue`, `get_customer_status`, `cancel_customer_queue_entry`.

Authenticated staff: `get_my_staff_profile`, `get_staff_dashboard`, `add_walk_in`, `call_next`, `start_queue_service`, `complete_queue_service`, `mark_queue_cancelled`, `mark_queue_no_show`, `readd_no_show`, `get_barber_dashboard`, `set_my_barber_break`, `get_owner_settings`, `save_salon_settings`, `upsert_service`, `upsert_barber`.

## What remains manual

### Add demo queue records to this existing project

After the reviewed fifth migration is deployed:

1. Copy `.env.demo.example` to `.env.demo.local`.
2. Set `SUPABASE_URL` and `SALON_DEMO_PROJECT_REF` to the existing project, its `SUPABASE_SERVICE_ROLE_KEY` (local script only), the app URL, and a stable `DEMO_SEED_KEY`.
3. Set three unique test-only 10-digit phone numbers. Do not use actual customer numbers. The RPC refuses numbers already present anywhere in queue history.
4. Run `npm run demo:seed -- --confirm-project YOUR_EXISTING_PROJECT_REF` and type `SEED DEMO YOUR_EXISTING_PROJECT_REF` at the prompt.

The script does not access Supabase Auth. Existing owner/barber users and passwords stay unchanged; sign in using the existing staff accounts. The RPC uses the first enabled existing service and the shared queue-creation helper to add three Waiting entries named `[DEMO] Queue Customer 1` through `3`, with normal tokens, service snapshots, activity logs and private status URLs. Reusing the same seed key returns the original entries. The status URLs are saved locally in ignored `.demo-status-links.txt`.

These sample entries are added to the real current queue and therefore affect queue counts and waiting estimates until staff advance their statuses. Plan to seed at a suitable time. No settings, services, barbers, staff records or existing queue entries are edited or deleted.

- Configure the Supabase URL/public key in `.env.local` and Vercel without copying the service-role key into frontend configuration.
- Review and apply only the additive demo migration after checking the remote migration history and dry run.
- Confirm the proposed timezone and currency with the TA/business owner.
- Complete authenticated role tests, write-workflow tests and cross-screen Realtime checks against the connected project; do not claim these passed until they have been run.

## Post-migration verification checklist

Run these checks after applying all pending migrations to the intended project:

1. In the Supabase SQL Editor, check that all eight tables have RLS enabled and that no policies grant browser access. A direct REST/API `SELECT` from `queue_entries` using the publishable/anon key should be denied.
2. With an unauthenticated client, calling `get_staff_dashboard` or `call_next` should fail at function permission checks. Public snapshot/join/status RPCs should remain callable.
3. Create test Auth users linked separately as `owner`, `receptionist`, and `barber`. Confirm `/admin`, `/reception`, and `/barber/:name` require sign-in and role access. A receptionist must be denied Start/Done; a barber must not be able to call another barber's Start/Done action or access the reception dashboard.
4. Use the TV snapshot RPC and verify its JSON contains barber names and tokens only, with no customer names or phone numbers.
5. Try adding a service with a case/whitespace-only duplicate name; the owner RPC should reject it. Existing duplicate service rows remain available to edit/disable and are not removed by the migration.
6. Run the additive demo seed script against the confirmed project. It requires a typed project-reference confirmation, checks phone-number collisions and seed markers, preserves existing records, and uses a function executable only by `service_role`.
7. With the same queue visible in two sessions, join/call/start/complete an entry and confirm Reception, Barber, Customer Status, and TV update via the Realtime `refresh` broadcast. Disable Realtime temporarily and verify the four-second polling fallback continues updating and displays reconnecting/stale feedback.

These checks are not claimed as passed until run against the connected project.
