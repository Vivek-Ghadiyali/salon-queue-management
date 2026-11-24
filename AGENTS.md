# AGENTS.md — Salon Queue Management System

A salon queue web app: customers join from a phone and track their wait; reception and barbers manage the queue; a TV shows who is being served and who is next.

## Read first
- `docs/01-brief.md` — problem, users, must-have features and exclusions.
- `docs/02-screens.md` — all seven screens, layouts, actions and responsive behaviour.
- `docs/03-flows-rules.md` — customer flows, queue rules, edge cases and test checklist.

## Stack and run
- Frontend: React + Vite + Tailwind CSS.
- Development command: `npm run dev`.
- Choose the simplest reliable shared storage/realtime approach that keeps customer, reception, barber and TV screens synchronized. Before implementing it, explain the choice and any required services/environment variables.
- Hosting target: Vercel for the frontend; Render or Railway if a separate backend is needed. A hosted database/realtime service may be used if it is the simplest reliable option.

## Working rules
- Read this file and all files in `docs/` before changing code.
- Build one screen or one feature per task. Do not implement the entire app in one prompt.
- Follow the documented requirements; do not invent extra features or change queue rules.
- Visual theme: dark luxury, near-black/charcoal surfaces, warm gold accent, refined typography and clear status colours.
- Interface language is English only. Do not add a Gujarati/English toggle or Gujarati labels.
- Keep queue rules in one shared place in the code and reuse them across screens.
- Make customer screens mobile-first; make reception usable on a tablet; make the TV display readable at 1920×1080 from approximately five metres.
- Ensure touch targets are at least 44px on phone layouts.
- Never add features listed in the Don't build section of `docs/01-brief.md`.
- Use realistic demo data, but do not present dummy data as real customer information.
- Do not claim a feature, test or deployment works until it has been run and verified.
- After each task, list changed files, explain how to test the change, and identify anything still incomplete.
- Run the app and test the affected flow after each step. Commit to Git after each working step; inspect the diff before accepting changes.
- Keep `prompts.md` updated with every prompt in the order used, including prompts that did not work.
- Deploy early after the Home and Join Queue screens are working. Check that no production code depends on localhost URLs.
- The live link must be the first line after the title in `README.md`. Put any staff demo login/PIN immediately below it only if staff access is protected by one.

## Deployment
Prepare the app for Vercel (frontend) and Render/Railway if a backend is used. Explain the exact build commands, environment variables and deployment steps for the chosen architecture. Verify the deployed URL on a phone-sized viewport and test the main queue flow on the live deployment.
