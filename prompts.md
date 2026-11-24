# Salon Queue Management System — AI Prompts

## Prompt 1

**Purpose:** Review the project requirements, describe the users, screens and queue rules, identify gaps or conflicts, and recommend a real-time architecture before implementation.

**Exact prompt text:**

```text
Read AGENTS.md and all three files inside docs/. I am developing this Salon Queue Management System as an MSc IT Vibe Coding Lab project. Before writing any code:

1. Summarize the project in 8 bullet points.
2. Explain all four user roles and seven screens.
3. Explain the queue management rules, especially barber preferences and waiting-time calculation.
4. Review the documents for missing or conflicting requirements.
5. Recommend the simplest reliable architecture for real-time synchronization and persistent storage across customer, reception, barber and TV screens.
Do not generate any code yet. Wait for my approval before proceeding.
```

**Result:** Reviewed the requirements and proposed an architecture for synchronized, persistent queue management; no application code was generated.

## Prompt 2

**Purpose:** Prepare the overall technical architecture and database design using the selected technology stack.

**Exact prompt text:**

```text
We have decided on the following technology stack for the Salon Queue Management System:

- Frontend: React + Vite
- Styling: Tailwind CSS
- Backend/Database: Supabase PostgreSQL
- Realtime: Supabase Realtime
- Authentication: Supabase Auth
- Deployment: Vercel
- Version Control: GitHub
Read the project documentation and prepare an overall technical architecture covering:

1. System architecture and how the frontend communicates with Supabase.
2. Database tables, fields and relationships.
3. Queue assignment logic and transaction requirements.
4. Realtime synchronization across all seven screens.
5. Authentication, user roles and Row Level Security (RLS).
6. Environment variables and deployment requirements.
Explain what Supabase provides and what I will need to develop myself.

Do not write code or modify project files. Wait for my approval before proceeding.
```

**Result:** Developed the Supabase-based architecture and database proposal, including queue assignment, realtime, security and deployment considerations.

## Prompt 3

**Purpose:** Refine the architecture with additional safeguards and prepare the final PostgreSQL schema for review.

**Exact prompt text:**

```text
Your architecture proposal is approved in principle. Before implementation, revise the proposal with these additional requirements:

1. Enforce one active Called or In Chair assignment per barber.
2. Add a queue_activity_logs table to record important queue status changes and staff actions.
3. Enforce the one-to-three-services limit at database level.
4. Secure customer status access using an opaque random token and restricted database functions.
5. Keep customer names and phone numbers private from the public TV display.
6. Use secure, restricted Realtime subscriptions or Broadcast events for customer and TV screens.
7. Use Asia/Kolkata as the proposed salon timezone and INR as the currency, subject to confirmation.
8. Manual online closing must take priority over automatic opening; online joining must also close automatically 30 minutes before closing.
9. Prevent another Call Next assignment if that barber already has a Called or In Chair customer.

Keep original requirements in AGENTS.md and docs/ as the source of truth. Clearly identify proposed refinements requiring TA approval.

After revising the architecture, prepare the final PostgreSQL schema and explain relationships.

Do not generate frontend or application code. Do not modify existing documentation files yet. Wait for approval.
```

**Result:** Revised the architecture and schema to include the requested safeguards; the refinements remained subject to TA approval.

## Prompt 4

**Purpose:** Build the React and Vite frontend foundation with reusable styling and layouts, Supabase client setup, and placeholder routes for all seven screens.

**Exact prompt text:**

```text
We are now starting the implementation of the Salon Queue Management System.

First, read AGENTS.md and all three documentation files inside docs/. Also inspect the existing project structure and prompts.md.

Implement the frontend foundation with the following requirements:

1. Set up React + Vite using JavaScript.
2. Configure Tailwind CSS correctly for the installed version.
3. Install and configure React Router and the Supabase JavaScript client.
4. Create a clean, scalable folder structure for components, pages, layouts, hooks, services and utilities.
5. Set up routes for all seven screens:

- Home (/)
- Join Queue (/join)
- My Status (/status/:id)
- Reception Dashboard (/reception)
- Barber View (/barber/:name)
- Waiting Area TV (/display)
- Owner Settings (/admin)
6. Create reusable layout components and a consistent design system.
7. Follow the selected Dark Luxury + Gold visual theme. Use a professional, modern salon interface with responsive layouts.
8. Add a .env.example containing the required Supabase environment variable names. Do not expose or invent credentials.
9. Add a basic loading page and a not-found page.
10. Ensure all seven routes render without errors, using simple placeholder content where full functionality is not yet implemented.
Important instructions:

- Follow the existing project documentation as the source of truth.
- Do not implement queue logic, database tables or authentication yet.
- Do not unnecessarily overwrite existing documentation.
- Keep the code modular and beginner-friendly.
- Run the application and fix any setup or build errors.
- Update prompts.md with this prompt and a brief result summary after successful completion.
At the end, explain the folder structure, installed dependencies, setup commands and how I can run the project locally.

Do not start the next development milestone automatically.
```

**Result:** Created the React/Vite foundation with Tailwind CSS 4, seven routes, reusable layouts and components, responsive styling, Supabase client configuration, and environment template. The production build passed and all routes loaded without browser runtime errors.

## Prompt 5

**Purpose:** Complete the frontend UI milestone for all seven screens with responsive sample-data previews and local-only interactions.

**Exact prompt text:**

```text
Continue implementing the Salon Queue Management System using the existing React + Vite + Tailwind CSS project.

First inspect the existing source code and project documentation. Do not recreate or overwrite working components unnecessarily.

Implement the complete frontend UI for all seven screens in one milestone:

1. Home (/): salon introduction, available services, barbers, opening information and Join Queue action.
2. Join Queue (/join): customer name, 10-digit phone number, selection of 1–3 services, barber preference (Any or a specific barber), form validation and queue joining UI.
3. My Status (/status/:id): token number, queue status, selected services, preferred/assigned barber, estimated waiting time and cancellation UI.
4. Reception Dashboard (/reception): queue overview, waiting customers, customer details, status filters and controls for queue operations.
5. Barber View (/barber/:name): assigned customers, current customer, service information and customer status controls.
6. Waiting Area TV (/display): large token display, currently serving customers and upcoming queue information.
7. Owner Settings (/admin): salon details, services, prices, durations, barbers, working availability and online joining settings.
Design requirements:

- Maintain the existing Dark Luxury + Gold theme.
- Use a consistent, premium salon design across all screens.
- Make every screen responsive for desktop, tablet and mobile.
- Reuse existing components and create additional reusable components where useful.
- Include realistic sample data for UI previews.
- Add proper loading, empty, validation and error states.
- Use accessible forms and clear action feedback.
- Make navigation between all seven screens functional.
Important:

- This milestone is frontend UI only.
- Do not connect to Supabase or implement actual queue/database operations yet.
- Clearly distinguish sample data from real data.
- Do not invent additional project features outside the documentation.
- Run npm run build and fix errors.
- Update prompts.md with this prompt and a concise result summary.
- Do not modify the existing planning documents.
- Stop after completing this milestone.
At the end, provide only a concise summary of completed screens, important files changed, build/test results and any remaining UI limitations.
```

**Result:** Implemented all seven responsive screens with fictional preview data and local-only interactions. Production build passed; browser checks confirmed route rendering, mobile fit and TV customer-name privacy. No live queue operations or Supabase connection were added.

## Prompt 6

**Purpose:** Implement the Supabase schema, secure transactional queue RPCs, and live frontend integration for customer and staff screens.

**Exact prompt text:**

```text
Continue the Salon Queue Management System. Implement the complete Supabase PostgreSQL backend and integrate it with the existing React frontend.

First inspect AGENTS.md, docs/, prompts.md and the existing source code. Reuse the current UI and components. Do not rebuild the frontend.

Implement the following in one milestone:

**1. Supabase database**

- Create SQL migration files for the complete database schema.
- Implement salon_settings, services, barbers, staff_profiles, daily_token_counters, queue_entries, queue_entry_services and queue_activity_logs.
- Add appropriate primary keys, foreign keys, indexes, constraints and timestamps.
- Enforce one active queue entry per phone number and one active Called/In Chair assignment per barber.
- Enforce the 1–3 services limit.
- Preserve service name, duration and price snapshots in queue entries.
- Use Asia/Kolkata for the proposed salon timezone and INR for currency.
**2. Queue operations**
Implement secure, transactional database functions for:

- Customer online queue joining.
- Receptionist walk-in joining.
- Daily sequential token generation (S-1, S-2, etc.).
- Call Next for a selected barber, respecting Any/specific barber preferences.
- Start service, mark Done, Cancel and No-show.
- Re-add a No-show customer at the end with a new token.
- Prevent invalid status transitions and duplicate active assignments.
- Calculate waiting estimates according to the existing project documentation.
**3. Frontend integration**
Replace sample-data operations with actual Supabase calls for:

- Join Queue and My Status.
- Reception Dashboard.
- Barber View.
- Owner Settings.
- Waiting Area TV.
Use loading, success and error feedback. Keep the existing design unchanged unless a small adjustment is necessary for integration.

**4. Database security foundation**

- Never expose the Supabase service-role key in frontend code.
- Use environment variables and the existing Supabase client.
- Prepare database permissions and security-conscious function definitions.
- Keep customer names and phone numbers away from public TV data.
**5. Configuration and verification**

- Create clear SQL migration and setup instructions.
- Update .env.example if needed.
- Explain how to run migrations and configure Supabase.
- If credentials or a Supabase project are unavailable, prepare the migrations and integration code without inventing credentials, and clearly identify what I must configure manually.
- Run npm run build and fix errors.
- Update prompts.md with this prompt and a brief result summary.
- Do not modify the original planning documents.
- Stop after this milestone.
At the end, provide a concise summary of database tables, SQL functions, frontend integrations, security measures, setup steps and anything still requiring manual configuration.
```

**Result:** Added the PostgreSQL migration, role-restricted RPC functions, RLS/table grants, private customer status access, and public token-only display data. Integrated the existing screens with Supabase Auth/RPCs and safe Realtime refreshes plus polling fallback. The frontend build and unconfigured preview checks passed; applying/testing against a Supabase project remains pending credentials and owner setup.

## Prompt 7

**Purpose:** Harden Supabase migration permissions and role checks, and complete visible Realtime connection/recovery handling.

**Exact prompt text:**

```text
Continue the Salon Queue Management System from the existing implementation.

Inspect the existing SQL migration, Supabase client, RPC functions, frontend integrations and project documentation. Do not recreate working functionality.

Complete the Supabase configuration, authentication, security and realtime milestone.

**1. Supabase setup and migration**

- Review the existing migration for missing dependencies, SQL errors, incorrect constraints and security issues.
- Provide exact steps to link the project and apply migrations using the Supabase CLI.
- Verify the migration against the actual Supabase database if credentials are configured.
- If credentials are unavailable, clearly explain the manual steps without repeatedly attempting unavailable connections.
**2. Staff authentication and role permissions**

- Implement Supabase Auth login/logout for Owner, Receptionist and Barber.
- Connect authenticated users to staff_profiles and their assigned roles/barber IDs.
- Protect staff routes from unauthenticated access.
- Ensure each role can only perform its permitted operations.
- Ensure barbers can only access their own assigned queue.
- Customers must continue using their private status token without needing a staff account.
**3. Database security**

- Review and correct RLS policies and RPC permissions.
- Prevent unauthorized direct table access.
- Secure SECURITY DEFINER functions, including search_path and execution grants.
- Prevent customers from viewing other customers' private details.
- Ensure TV/public data never contains customer names or phone numbers.
- Never expose service-role or secret keys in frontend code.
**4. Realtime synchronization**

- Ensure Reception, Barber, Customer Status and TV screens refresh when queue operations occur.
- Use the existing Supabase Realtime/Broadcast approach where appropriate.
- Keep the four-second polling fallback.
- Handle subscription errors, reconnects and stale data.
- Show a simple connection status where useful.
**5. Verification**

- Test login/logout and role-based route access.
- Test unauthorized RPC and database access.
- Verify realtime updates across screens.
- Run npm run build and fix errors.
- Update prompts.md with this prompt and a concise result summary.
- Do not change the existing planning documents or redesign the UI.
- Stop after this milestone.
At the end, provide a concise report of completed functionality, security checks, database verification status, manual configuration still required and test results.
```

**Result:** Added a follow-up migration that revokes staff RPC access from `anon`, restricts queue operations by staff role, and confines the Barber dashboard and Start/Done actions to the linked barber. Added reconnect/stale indicators with polling fallback and documented Supabase CLI, role and security verification steps. Build and unconfigured route checks passed; database, Auth and cross-session Realtime tests remain unverified without project credentials.

## Prompt 8

**Purpose:** Test and stabilize the existing customer, reception, barber, owner and public display workflows; fix the duplicate service and add private status-link access.

**Exact prompt text:**

```text
# PROMPT 08 — Complete Workflow Testing, Bug Fixing & Final UI Polish
The Salon Queue Management application has completed its frontend development, Supabase database integration, authentication, role-based access and core queue operations.

Now perform a comprehensive review of the existing application, identify issues, fix bugs and prepare the application for final deployment.

**IMPORTANT:**

- First inspect the complete existing project structure and implementation.
- Understand the existing architecture before modifying anything.
- Do not rebuild the application from scratch.
- Do not remove existing working functionality.
- Preserve the current design direction, components, database schema and Supabase integration unless a change is genuinely necessary.
- Do not introduce unnecessary dependencies or features.
- Make changes carefully without breaking previously completed functionality.

## 1. Complete Application Workflow Testing
Inspect and verify the following workflows.

### A. Customer workflow

- Customer can view salon details and available services.
- Customer can enter their name and 10-digit phone number.
- Customer can select between 1 and 3 services.
- Customer can select a preferred barber or Any Barber.
- Customer can join the queue when online joining is enabled.
- Token generation should work correctly.
- Duplicate active queue entries for the same phone number should be prevented.
- Customer should receive a private status link after successfully joining.

### B. Customer My Status functionality
Inspect the existing customer status page and its routing.

Currently, the application does not provide a clear and reliable way for customers to reopen their existing queue status.

Fix this functionality.

Requirements:

- Provide a clear My Status entry point in the customer-facing navigation or an appropriate customer-facing location.
- Customers should be able to access their existing queue status using the private status link generated during queue registration.
- Do not assume that the queue token itself is the private status URL.
- Ensure that the private status link works for waiting, called, in-service and completed queue entries, wherever appropriate.
- Show the correct token, selected services, assigned barber, queue status and relevant progress.
- Handle invalid or unavailable links with a clear message.
- Never expose private customer information on the public display.
- Do not weaken existing authentication or private-link security.

### C. Reception workflow

- Reception staff can view the current queue.
- Reception staff can call the next eligible customer.
- Barber assignment and customer preferences should be respected.
- Reception staff can manually add walk-in customers.
- Walk-in registration must work even when online joining is closed.
- Reception staff can manage the supported queue actions.
- Queue counts and customer statuses should update correctly.

### D. Barber workflow

- Barber accounts should only access their assigned barber workspace.
- Barbers should see customers assigned to them.
- Barbers should be able to start and complete services.
- Verify that queue status transitions are correct.
- Prevent unauthorized access to other staff functionality.

### E. Owner workflow

- Owner can manage salon settings.
- Owner can manage services, prices, durations and availability.
- Owner can manage barber information and assignments.
- Verify that owner-only functionality remains protected.

### F. Public Display

- Display should show current barber availability.
- Display should show customers currently being served and the next waiting tokens.
- Completed, cancelled and no-show customers must not appear as waiting or currently being served.
- Customer names and phone numbers must remain private.

## 2. Supabase and Database Verification
Inspect the existing Supabase implementation.

Verify:

- Database queries and RPC functions.
- Authentication and role-based access.
- Row Level Security policies.
- Realtime subscriptions and updates.
- Queue status transitions.
- Token generation and daily token counters.
- Barber assignments.
- Walk-in registration.
- Service snapshots and activity logs.
- Proper error handling.
- Prevention of duplicate or inconsistent queue records.
Important:

- Do not expose the Supabase service-role key.
- Do not place secret credentials in frontend code.
- Do not disable RLS to solve permission issues.
- Do not replace secure RPC operations with unrestricted direct database writes.
- Do not modify existing database migrations unnecessarily.
- If a database change is required, create a new migration rather than rewriting already-deployed migrations.

## 3. Fix Identified UI and Functional Issues
Inspect the complete application and fix the following known issues.

### A. Duplicate service
The Join Queue page currently displays Shaving twice.

Inspect the database records and frontend rendering to identify the cause.

Ensure that each service is displayed only once and that existing service records are not accidentally deleted.

### B. Customer status navigation
The customer-facing navigation currently lacks a proper My Status entry point.

Implement the appropriate navigation and private-link access described in Section 1B.

### C. Walk-in registration
Verify that the Add Walk-in form works correctly, including:

- Customer details.
- Service selection.
- Barber preference.
- Validation.
- Successful queue creation.
- Appropriate success and error messages.

### D. General UI consistency
Inspect all existing screens for:

- Incorrect spacing and alignment.
- Inconsistent typography.
- Broken navigation.
- Missing loading states.
- Poor error messages.
- Empty-state presentation.
- Responsive layout issues.
- Buttons that do not perform their intended actions.
Maintain the current salon branding and visual design. Avoid unnecessary redesigns.

## 4. Remove Supabase Configuration Label from Navbar
Inspect the existing navigation/header component and remove the visible **"Supabase configured"** status indicator from the top-right navbar.

Requirements:

- Remove only the visible configuration label.
- Do not remove or modify the Supabase client initialization.
- Do not change environment variables, authentication, database connections, or backend functionality.
- Preserve the existing navbar layout and responsiveness.
- Ensure that removing the label does not leave unnecessary empty space or alignment issues.
- Check that the application still builds successfully.

## 5. Error Handling and Application Stability
Review the application for:

- Console errors.
- Failed network requests.
- Incorrect loading states.
- Unhandled Supabase errors.
- Invalid form submissions.
- Authentication/session issues.
- Broken page navigation.
- Data inconsistencies.
Fix genuine issues without changing unrelated functionality.

## 6. Responsive Design
Check the existing application on:

- Desktop screens.
- Tablet screens.
- Mobile screens.
Ensure that:

- Navigation remains usable.
- Queue tables and cards remain readable.
- Forms fit smaller screens.
- Buttons remain accessible.
- Public Display remains readable.
- No important content overflows horizontally.
Preserve the existing visual identity.

## 7. Final Verification
After making the necessary changes:

1. Run the existing production build command.
2. Fix any build errors.
3. Check the browser console for errors.
4. Verify the affected screens and workflows.
5. Verify that Supabase authentication and database connectivity remain functional.
6. Verify that the existing owner and barber accounts still work.
7. Verify that the existing queue records remain intact.
Do not claim that a feature or test passed unless it was actually verified.

## 8. Final Report
When finished, provide a clear report containing:

1. Issues identified.
2. Changes implemented.
3. Files modified.
4. Database changes or new migrations, if any.
5. Tests performed and their actual results.
6. Any remaining issues requiring attention.
7. Production build result.
**Final instruction:** This is a stabilization and quality-assurance phase. Prioritize correctness, security, reliability and consistency over adding new features. Keep the application ready for the final deployment and documentation phase (Prompt 09).
```

**Result:** Confirmed the live public RPC returns two Shaving rows with identical display details; customer menus now show one option while Owner Settings preserves both records for review. Added owner-side duplicate-name checks and a new RPC migration to block future duplicate names. Added My Status navigation, private-URL input/copy access that rejects queue numbers, and removed the Supabase configuration label from headers. Build, public snapshot/TV privacy, anonymous table and staff-RPC denial, route, private-link validation and mobile/tablet/desktop/TV overflow checks passed. No queue or service records were changed. Owner/barber login, walk-in/queue writes and cross-screen Realtime writes remain unverified because staff credentials were not supplied and online joining is currently closed; the new migration remains unapplied because the Supabase CLI is unavailable.

## Prompt 9

**Purpose:** Prepare the existing application for final deployment, demonstration and academic submission, including safe demo data setup and project documentation.

**Exact prompt text:**

```text
# PROMPT 09 — Final Deployment, Documentation & Project Submission
The Salon Queue Management application has completed its development and final quality-check phase.

Now prepare the project for final deployment, demonstration and academic submission.

IMPORTANT:

- Inspect the existing project before making changes.
- Preserve all working functionality.
- Do not rebuild the application.
- Do not introduce unnecessary features or dependencies.
- Do not overwrite existing project documentation without checking it first.

## 1. Final Project Verification

- Verify the React + Vite application.
- Verify Supabase database connectivity.
- Verify authentication and role-based access.
- Verify existing database migrations.
- Run npm run build and resolve any remaining build errors.
- Ensure environment variables are configured correctly.

## 2. Automatic Demo Data Setup
I want to demonstrate the complete application without manually creating owner, barber and customer records every time.

Create a reusable and safe demo-data setup.

It should prepare:

- Sample salon settings.
- Sample salon services.
- Three sample barbers.
- Dedicated owner and barber demonstration accounts.
- Sample customer records.
- Sample queue entries covering relevant statuses such as Waiting, Called, In Service and Completed.
Requirements:

- Use dedicated demo accounts and clearly labelled sample data.
- Make the setup repeatable without creating duplicate records.
- Do not overwrite or delete existing real data.
- Do not automatically insert demo records into the production database.
- Keep demo setup separate from production deployment.
- Use secure server-side or local scripts for Supabase Auth account creation.
- Never expose the service-role key in frontend code, VITE environment variables, GitHub or browser requests.
- Document the demo account credentials and setup procedure securely.
- If automatic Auth account creation requires additional configuration, provide exact setup instructions.
I should be able to prepare the demonstration environment using a simple documented command instead of manually entering every record.

## 3. Deployment Preparation
Prepare the application for production deployment.

- Check Vite production configuration.
- Prepare deployment instructions for Vercel or another suitable hosting platform.
- Document the required environment variables.
- Explain how to configure Supabase URL and publishable key.
- Ensure the application does not depend on localhost URLs in production.
- Configure SPA routing fallback if required.
- Verify that no secret credentials are included in the production frontend.
Do not deploy to a live public URL or make production database changes without explicit instructions.

## 4. README Documentation
Create or update a professional README.md containing:

1. Project title and overview.
2. Problem statement.
3. Objectives.
4. Main features.
5. Technology stack.
6. System architecture.
7. Database overview.
8. User roles and permissions.
9. Installation instructions.
10. Environment configuration.
11. Supabase setup and migration instructions.
12. How to run the application.
13. Demo data setup instructions.
14. Deployment instructions.
15. Screenshots section.
16. Future scope.
Use the actual implementation as the source of truth. Do not invent features or technologies.

## 5. GitHub Preparation

- Check the existing Git repository.
- Verify .gitignore.
- Ensure .env.local and all secret files are excluded.
- Check that no service-role key or password is committed.
- Organize project documentation.
- Do not delete existing source files or migrations.
- Do not push changes to GitHub without explicit approval.

## 6. Final Submission Report
Provide:

- Final project structure.
- Features verified.
- Build result.
- Deployment readiness.
- Demo setup command and instructions.
- Demo accounts and how to access them.
- Documentation files created or updated.
- Remaining manual configuration, if any.
- Any known limitations.
Final objective: Prepare a clean, secure, documented and demonstrable Salon Queue Management project suitable for academic evaluation and final submission.
```

**Result:** Added a dedicated-project demo seed workflow and service-role-only migration, local secret-file template/ignores, Vercel SPA fallback, and deployment/Supabase/demonstration instructions in the README and Supabase guide. Production build passed. No demo seed, migration, or deployment was run; live Auth/write workflows and cross-screen Realtime updates remain unverified. Git metadata and Git CLI are unavailable in this workspace, so committed-file history could not be audited.

## Prompt 10

**Purpose:** Adapt demo seeding to add repeatable sample queue entries in the existing Supabase project while preserving its current settings, records and Auth accounts.

**Exact prompt text:**

```text
# Modify Demo Seed Setup for Existing Supabase Project
I currently have only ONE Supabase project: Salon Queue Management.

The application is already connected to this project, and it contains existing salon settings, services, three barbers, an owner account, a barber account and previous testing records.

The current `scripts/seed-demo.mjs` requires a separate, empty demo Supabase project. I do not want to create another Supabase project.

Please inspect the existing demo seed script, migrations and database schema, and adapt the demo setup so it can safely work with my existing Supabase project.

## Requirements

1. Preserve all existing owner, barber and customer accounts.
2. Preserve existing salon settings, services and barber records.
3. Do not delete, truncate or reset any existing database tables.
4. Do not overwrite existing records.
5. Create dedicated demo customer records and queue entries only when they do not already exist.
6. Make the script repeatable without generating duplicate demo data.
7. Ensure demo records are clearly identifiable.
8. Use the existing database schema and RPC functions wherever possible.
9. Maintain existing RLS policies and security.
10. Never expose the Supabase service-role key in frontend code, VITE variables, GitHub or browser requests.

## Authentication
Do not recreate existing Auth users or change their passwords.

Reuse existing staff accounts where appropriate. If additional demo accounts are necessary, explain the secure creation process.

## Safety
Before implementing changes:

- Inspect the current script and all related migrations.
- Identify which operations currently require an empty database.
- Explain any risks to existing data.
- Do not execute the seed script or apply database changes automatically.
If a safe implementation requires a new migration, create a new migration without modifying previously deployed migrations.

## Final instructions
Provide:

1. Files modified.
2. Database changes required.
3. Exact environment configuration required.
4. Exact command to run the updated demo setup.
5. Explanation of how existing data is protected.
6. Any manual steps I must complete.
The final setup should allow me to prepare a project demonstration using my existing Supabase project without manually creating customers and queue entries every time.
```

**Result:** Replaced fresh-project/Auth-user requirements with a local service-role-only seed script and new additive migration. It preserves existing salon/staff records, adds three `[DEMO]` waiting entries using an enabled existing service and normal token/snapshot creation, refuses phone-history collisions, and is idempotent by seed key. Migration deployment and seeding were not run.
