# ESG Build Completion - Vibecoding Prompts

> **Status**: This is the primary prompt book for closing the current build and user-flow gaps found in the April 6, 2026 review.
>
> **Use this after**:
> - `data/ESG_REMEDIATION_PLAN.md`
> - the current role controllers and role HTML pages under `src/roles/` and `teams/blue/`
>
> **What changed**:
> - the work is now organized around the actual shipped build, not the aspirational full platform
> - prompts are ordered by dependency so the most blocking flow breaks are fixed first
> - prompts explicitly separate current-build completion from optional scope expansion
>
> **Scope assumptions locked for this book**:
> - `src/` is the canonical application code
> - the current architecture is a multi-entry Vite build with static role pages
> - blue-team role pages are the currently shipped role surfaces

---

## Purpose

Use this prompt book to complete the current ESG simulation build so the core user flows work end to end:

- Game Master creates and monitors sessions
- participants join the right role page
- Facilitator drafts and submits actions
- White Cell controls move, phase, timer, adjudication, and RFI responses
- Notetaker saves and reloads observations and analysis
- observer and admin flows are safe and not misleading
- the build has real automated coverage for the shipped flows

This book is for current-build completion and stabilization.

It is not for:

- a full architecture rewrite
- a speculative multi-team expansion without a product decision
- backend redesign beyond what is required to make the shipped flows correct
- long-horizon enhancements like analytics, deep offline sync, or major visual redesign

---

## Codified Build Boundary

This boundary is non-negotiable for every prompt in this file.

**What this book may do:**

- align HTML, controller, store, and service contracts so shipped pages actually work
- complete the missing transitions in the current action, RFI, timeline, and session flows
- remove or hard-disable misleading UI where the build does not support a feature yet
- add tests that lock current behavior and prevent regression
- tighten role handling so passive roles do not get active controls

**What this book must never do:**

- invent new database field names when the current schema already has a canonical field
- keep claiming a feature exists when it is only partially wired
- map passive roles to active pages without explicit read-only enforcement
- claim an offline or demo mode unless the data layer actually supports it
- expand to red or green team flows unless the prompt explicitly makes that the task
- silently change page routes, storage keys, or role semantics without updating tests and documentation

**Current architecture rule:**

Preserve the multi-entry Vite structure unless a prompt explicitly says to change it. Do not start a router migration while fixing the current build.

**Current contract rule:**

When HTML and JS disagree, pick one contract and make both sides consistent. Do not leave duplicate selector sets or "temporary" dual paths unless tests prove both are required.

---

## Prerequisites Gate

Do not start these prompts unless all of the following are true:

1. You have read the current role pages and role controllers:
   - `teams/blue/facilitator.html`
   - `teams/blue/notetaker.html`
   - `teams/blue/whitecell.html`
   - `master.html`
   - `src/roles/facilitator.js`
   - `src/roles/notetaker.js`
   - `src/roles/whitecell.js`
   - `src/roles/gamemaster.js`
2. You have read the current session and data-layer files:
   - `src/stores/session.js`
   - `src/services/database.js`
   - `src/services/supabase.js`
3. You understand that `npm run build` currently passes, but `npm test -- --run` does not because there are no real tests yet.
4. You will use this book in order unless a prompt explicitly says otherwise.
5. You will treat the current shipped build as the truth source for what users can access today.

If any of these are false, stop and establish baseline context first.

---

## Working Rules

1. Fix blockers in complete user flows before polishing secondary pages.
2. Prefer deleting or disabling misleading UI over shipping dead buttons and empty sections.
3. If a prompt changes lifecycle rules, update validators, rendering, and tests in the same pass.
4. If a prompt affects role access, enforce it in code paths, not just labels or comments.
5. Add or update tests as behavior stabilizes. Do not defer all testing to the end.
6. Keep `src/` authoritative. Do not revive legacy code from archived directories.
7. Keep documentation short and operational. Record decisions that change product scope or runtime assumptions.

---

## Canonical Execution Order

1. Fix White Cell controller-to-page wiring and restore the control surface.
2. Implement the real action lifecycle and observer-safe access rules.
3. Repair session-store eventing and shared UI state updates.
4. Fix Notetaker persistence and reload behavior.
5. Complete the Game Master dashboard and export flow.
6. Resolve the Supabase missing-config behavior honestly.
7. Add automated coverage for the shipped flows.
8. Make an explicit build-scope decision on blue-only versus broader team support.

---

## What Stays Out Of This Book

The following remain out of scope for this prompt book unless directly required by a current blocker:

- full backend hardening or RLS redesign
- advanced offline queueing and replay
- analytics pipelines
- a full design-system rewrite
- green-team or red-team role implementation
- a SPA or framework migration

Use `data/ESG_REMEDIATION_PLAN.md` for larger follow-on work once this build is functionally complete.

---

## Prompt 1 - Fix the White Cell page contract and restore operator controls

```text
Read the current White Cell page and controller.

Make the White Cell role fully operational by aligning the DOM contract and controller behavior.

Work in these files first:
- teams/blue/whitecell.html
- src/roles/whitecell.js
- src/main.js

Requirements:
1. Choose one selector contract for move, phase, timer, action review, adjudication, RFI queue, communications, and timeline.
2. Make the HTML and JS agree on all IDs and section containers.
3. Ensure move, phase, and timer controls actually work from the rendered page.
4. Ensure action review and adjudication render into the visible page sections.
5. Ensure the RFI queue loads and responses can be sent from the visible UI.
6. Keep only one communications send path: either bind the inline form or replace it with a modal trigger, but do not leave both half-wired.
7. Preserve header move, phase, and timer updates after control changes.
8. Remove or disable any dead section that is still present but not backed by code.

When done, summarize:
- which White Cell controls were restored
- which DOM mismatches were removed
- what user flow is now complete end to end
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 2 - Implement the real action lifecycle and observer-safe access

```text
Read the landing page, facilitator flow, White Cell review flow, and enum definitions.

Implement the actual action lifecycle and close the observer access hole.

Work in these files first:
- src/roles/landing.js
- src/roles/facilitator.js
- teams/blue/facilitator.html
- src/roles/whitecell.js
- src/core/enums.js
- src/services/database.js

Requirements:
1. Create an explicit lifecycle for actions: draft -> submitted -> adjudicated, with no ambiguous fallback.
2. Facilitators may create, edit, and delete draft actions only.
3. Submitted actions must become read-only for facilitators.
4. White Cell review and adjudication queues must operate on submitted actions, not raw drafts.
5. Badge counts must reflect the same lifecycle rules used by the lists.
6. Add a clear submit action control in the facilitator flow if one does not exist.
7. Do not route observers to an active facilitator experience unless the page enforces read-only behavior in code.
8. Default recommendation: either create a dedicated observer mode on the facilitator page or block write handlers and hide all write controls for the viewer role.
9. Keep status names, DB writes, rendering, and validation aligned across all role pages.

When done, summarize:
- the lifecycle that now exists
- how observer access is enforced
- which pages changed as a result
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 3 - Repair session-store events and shared game-state updates

```text
Read the session store, shared app bootstrap, and the role controllers that depend on session data.

Fix the session and UI synchronization contract so updates propagate consistently.

Work in these files first:
- src/stores/session.js
- src/main.js
- src/roles/whitecell.js
- src/roles/landing.js

Requirements:
1. Make the subscribe and notify API unambiguous and internally consistent.
2. If session_updated events are supported, deliver them with the payload listeners expect.
3. If the store only supports state snapshots, update all listeners to consume that model correctly.
4. Ensure move, phase, and timer changes update shared header state on the active page.
5. Ensure post-join session data is cached and readable by subsequent role pages.
6. Remove any dead assumptions about callback signatures or event names.
7. Add tests that lock the chosen event model so this does not regress.

When done, summarize:
- the store event model now in use
- which listeners were updated
- how game-state changes now reach the UI
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 4 - Fix Notetaker persistence, hydration, and autosave reliability

```text
Read the Notetaker role controller and the notetaker database methods.

Make Notetaker data persist and reload correctly using the current schema columns.

Work in these files first:
- src/roles/notetaker.js
- src/services/database.js
- teams/blue/notetaker.html

Requirements:
1. Stop relying on data_type or generic data payload assumptions that the database does not store.
2. Load dynamics data from dynamics_analysis and alliance data from external_factors.
3. Save and reload data by session_id and move using the current schema contract.
4. Include phase and team in saves if the current schema supports them.
5. Ensure autosave indicators reflect real save outcomes.
6. If observation_timeline is part of the schema contract, append to it intentionally rather than replacing prior observations.
7. Verify that a page reload restores the last saved state for the current move.
8. Add tests for load, save, and reload behavior.

When done, summarize:
- which fields now round-trip correctly
- how autosave behaves on success and failure
- what assumptions remain about move-scoped storage
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 5 - Complete the Game Master dashboard and export flow

```text
Read the Game Master controller and page.

Replace placeholder admin behavior with working monitoring and export flows.

Work in these files first:
- src/roles/gamemaster.js
- master.html
- src/services/database.js
- src/features/export/

Requirements:
1. Replace hard-coded dashboard values with real computed data where the data already exists.
2. Populate recent activity and active participant panels, or remove them if the current build cannot support them yet.
3. Keep session detail and participant views consistent with the selected session.
4. Align export buttons and handlers so only rendered controls are wired.
5. If PDF export is supported, render a visible trigger. If it is not supported, remove the dead handler.
6. Make the export flow clear when no session is selected.
7. Keep session management, participant visibility, and export behavior internally consistent.
8. Add tests for the dashboard data mapping and export button wiring.

When done, summarize:
- which admin panels now show real data
- how export selection works
- which placeholders were removed or replaced
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 6 - Resolve the Supabase missing-config path honestly

```text
Read the Supabase service, config handling, and database service.

Fix the mismatch between claimed offline/demo behavior and actual runtime behavior.

Work in these files first:
- src/services/supabase.js
- src/services/database.js
- src/core/config.js
- .env.example
- index.html
- master.html

Requirements:
1. Choose one safe behavior and implement it fully.
2. Default recommendation: treat backend configuration as required and fail clearly when it is missing.
3. If you keep an offline or demo mode, implement a real local adapter for every core flow touched by sessions, actions, requests, timeline, and notetaker data.
4. Do not leave a state where the app logs "demo mode" but the database layer still blindly calls supabase.from(...).
5. Surface missing-config failures to the user with clear UI, not silent console-only errors.
6. Keep .env.example aligned with the actual required runtime values.
7. Document the chosen behavior in a short operator note if the repo has no suitable existing README section.

When done, summarize:
- which runtime mode was chosen
- what users now see when config is missing
- how the data layer behaves safely under that condition
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed April 6
---

## Prompt 7 - Add real automated coverage for the shipped flows

```text
Read package.json, current test scripts, and the stabilized role flows after Prompts 1 through 6.

Add automated coverage that reflects the current shipped build, not hypothetical future architecture.

Work in these files first:
- package.json
- src/
- tests/
- any Playwright config or support files needed for stable execution

Requirements:
1. Make npm test -- --run pass with real tests.
2. Add unit or controller-level tests for the most failure-prone logic:
   - session store eventing
   - action lifecycle transitions
   - Notetaker save/load mapping
   - White Cell DOM contract wiring
3. Add at least one end-to-end smoke flow that covers:
   - session creation
   - role join
   - action submit
   - White Cell adjudication or RFI response
4. Keep the tests scoped to the currently shipped build.
5. If the E2E path depends on backend availability, provide a stable mock or test mode rather than leaving the script permanently red.
6. Make npm run test:e2e meaningful before you declare this prompt complete.

When done, summarize:
- what is covered by unit or integration tests
- what is covered by E2E
- what remains intentionally untested and why
```

**You run:**

```bash
npm test -- --run
npm run test:e2e
npm run build
```
Completed April 6
---

## Prompt 8 - Make an explicit build-scope decision and remove misleading copy

```text
Read the landing page, build inputs, and the currently shipped role surfaces.

Make the shipped scope explicit so the UI does not imply unsupported roles or team flows.

Work in these files first:
- index.html
- src/roles/landing.js
- vite.config.js
- teams/
- data/ESG_REMEDIATION_PLAN.md

Requirements:
1. Decide whether the current product is blue-team-only or whether more teams are meant to ship now.
- The green and red teams must also ship in this version.
2. If the build is blue-team-only, update copy, placeholders, labels, and routes so they do not imply red, green, or broader delegation support that does not exist.
3. Add the missing pages, routes, and build inputs intentionally rather than hinting at them.
4. Resolve misleading text such as generic delegation labels when the route surface is narrower.
5. Record the scope decision in documentation so future prompts do not reopen it accidentally.

When done, summarize:
- the explicit shipped scope
- which copy or routes changed
- whether future multi-team work remains open
```

**You run:**

```bash
npm run build
npm test -- --run
```

---

## Exit Criteria For This Book

Use this book until all of the following are true:

- White Cell controls and queues work from the rendered page
- Facilitator can draft, submit, and then view submitted actions correctly
- observer access is truly read-only or routed to a dedicated passive experience
- Notetaker data survives reloads
- Game Master panels show real data or no longer pretend to
- Supabase missing-config behavior is explicit and safe
- `npm run build` passes
- `npm test -- --run` passes
- `npm run test:e2e` exercises at least one meaningful cross-role flow

If those are not true, this book is still active.

---

## Completion Handoff

Once this book is complete, the team should have:

1. a current build whose visible controls match its actual code paths
2. complete core user flows for the shipped roles
3. a truthful runtime story about backend availability
4. automated coverage for the main role interactions
5. a clear documented statement of current scope

If any of those are still missing, do not move on to broader enhancement work yet.
