# ESG Live Demo Hardening - Vibecoding Prompts

> **Status**: This is the primary prompt book for hardening the current ESG build for a live demo delivered through GitHub Pages against the current Supabase project.
>
> **Use this after**:
> - `data/ESG_FUNCTIONAL_COMPLETION_PROMPT_BOOK.md`
> - `data/ESG_REMEDIATION_PLAN.md`
> - `data/ESG_CODE_REVIEW_RESPONSE.md`
>
> **What changed**:
> - the work is now organized around live-demo readiness, not general build completion
> - the deployment target is a dedicated GitHub Pages project site
> - public participant join remains open by session code
> - White Cell and Game Master are operator-only surfaces
> - exports are intentionally reduced to JSON and CSV only
> - prompts are ordered to harden the backend trust model before expanding operator flows
>
> **Scope assumptions locked for this book**:
> - `src/` is the canonical application code
> - the current architecture remains a multi-entry Vite build with static role pages
> - the current Supabase project is retained for the demo
> - GitHub Pages is frontend hosting only; real enforcement must live in Supabase policies and RPCs
> - public participant roles are Facilitator, Notetaker, and Observer
> - White Cell and Game Master are operator-only roles and may not be claimed from the public landing page
> - the live exercise target for one team is:
>   - 1 facilitator
>   - 4 notetakers
>   - 2 White Cell operators
>   - 5 observers
> - JSON and CSV are the only required export formats for the live session
> - the GitHub Pages project-site URL shape is `https://<owner>.github.io/<repo-slug>/`
>
> **Current baseline**:
> - `npm run build` passes
> - `npm test -- --run` passes
> - `npm run test:e2e` passes, but only for a narrow mock-backed smoke flow

---

## Purpose

Use this prompt book to harden the current ESG simulation build so a live demo can be run safely from GitHub Pages with the current Supabase backend.

The end state for this book is:

- the GitHub Pages deployment works under a project-site path
- participants can join by session code without browser-side session discovery
- facilitator, notetaker, and observer flows remain easy to access
- White Cell and Game Master are restricted to operator access
- role caps, presence, disconnects, and stale-seat recovery work reliably
- real-time updates are actually wired into the shipped pages
- 4 notetakers can work concurrently without silently overwriting each other
- the live admin/export surface is simplified to what is actually required
- automated coverage and rehearsal steps reflect the real live-demo topology

This book is for live-demo hardening and operational readiness.

It is not for:

- a platform rewrite
- a migration off the current Supabase project
- PDF, XLSX, or ZIP export completion
- a full offline mode
- custom domain setup beyond what GitHub Pages already supports
- speculative features not required for the live demo

---

## Codified Demo Boundary

This boundary is non-negotiable for every prompt in this file.

**What this book may do:**

- add a GitHub Pages deployment workflow and Pages-safe routing
- change role access rules where required for operator-only enforcement
- introduce Supabase RPCs, policies, and auth flows required for secure public join
- restructure seat allocation and presence logic to match the live participant target
- simplify UI and exports to remove risky or unsupported live-demo behavior
- add tests and rehearsal steps that reflect the actual demo topology

**What this book must never do:**

- pretend GitHub Pages itself is the security layer
- trust `localStorage` role values for any privileged action
- keep White Cell publicly claimable from the participant landing page
- ship PDF or XLSX export just because dependencies already exist
- rely on browser-side enumeration of all active sessions for public join
- leave dead operator controls or dead export controls visible in the live demo
- increase concurrent role caps without also solving the underlying write-collision problem

**Current architecture rule:**

Preserve the multi-entry Vite structure. Do not start a SPA or framework migration while hardening the demo build.

**Security rule:**

If a feature is operator-only, enforce that in Supabase-backed auth and policy paths, not just in route labels or hidden buttons.

**Deployment rule:**

All navigation and redirects must work when the app is served from a GitHub Pages project path such as `/<repo-slug>/`, not just from `/`.

---

## Prerequisites Gate

Do not start these prompts unless all of the following are true:

1. You have read the current deployment and routing files:
   - `vite.config.js`
   - `index.html`
   - `master.html`
   - `src/main.js`
   - `src/roles/landing.js`
2. You have read the current role and data files:
   - `src/roles/facilitator.js`
   - `src/roles/notetaker.js`
   - `src/roles/whitecell.js`
   - `src/roles/gamemaster.js`
   - `src/services/database.js`
   - `src/services/supabase.js`
   - `src/services/realtime.js`
   - `src/services/sync.js`
   - `src/stores/session.js`
   - `src/stores/participants.js`
3. You have read the current schema and audit context:
   - `data/COMPLETE_SCHEMA.sql`
   - `data/ESG_CODE_REVIEW_RESPONSE.md`
   - `data/ESG_REMEDIATION_PLAN.md`
4. You understand the locked live-demo rules:
   - public join by session code
   - operator-only White Cell and Game Master
   - current Supabase project retained
   - GitHub Pages project-site deployment
   - JSON and CSV only
5. You understand that the existing automated tests do not yet prove real backend security, role claiming, or 12-user live behavior.

If any of these are false, stop and establish baseline context first.

---

## Working Rules

1. Fix trust boundaries and operator access before polishing participant UX.
2. Prefer removing or hard-disabling risky live-demo features over shipping half-secured behavior.
3. When a prompt changes seat rules, update the backend claim logic, UI copy, and tests in the same pass.
4. When a prompt changes routes or redirects, verify behavior under a GitHub Pages project path.
5. When a prompt changes role access, update both public landing behavior and direct-route protection.
6. Keep the current Supabase project, but treat it as insecure until policies and RPCs are hardened.
7. Keep `src/` authoritative. Do not revive archived legacy files to solve live-demo blockers.
8. If a prompt adds Supabase SQL, record it in a dedicated migration file rather than scattering ad hoc SQL fragments.
9. Add or update automated coverage as behaviors stabilize; do not postpone all validation to the final step.

---

## Canonical Execution Order

1. Make the build deploy correctly to GitHub Pages project-site paths.
2. Split public participant access from operator-only surfaces.
3. Replace browser-side session discovery with secure session-code join RPCs.
4. Harden role claiming, seat limits, heartbeat, and disconnect recovery.
5. Wire the shipped pages to real-time sync and store updates.
6. Make multi-notetaker and observer behavior safe for live concurrency.
7. Simplify the Game Master/export surface to JSON and CSV only.
8. Add meaningful automated coverage and a 12-user rehearsal workflow.

---

## What Stays Out Of This Book

The following remain out of scope unless directly required by a blocking live-demo defect:

- custom domain provisioning
- migration to a new Supabase project
- PDF, XLSX, or ZIP export support
- a full anonymous analytics or research pipeline redesign
- a real offline queueing system
- a full design-system overhaul
- a general-purpose RBAC platform beyond what this demo needs

---

## Prompt 1 - Make the build deploy correctly to a GitHub Pages project site

```text
Read the Vite config, top-level HTML entries, and all code paths that perform navigation or redirect.

Make the current build deploy and navigate correctly when hosted on a GitHub Pages project site such as:
- https://<owner>.github.io/<repo-slug>/

Work in these files first:
- vite.config.js
- src/main.js
- src/roles/landing.js
- src/roles/facilitator.js
- src/roles/notetaker.js
- src/roles/whitecell.js
- src/roles/gamemaster.js
- index.html
- master.html
- .github/workflows/ (create the deployment workflow if missing)

Requirements:
1. Audit every hard-coded absolute route such as `/`, `/master.html`, or `/teams/...` and replace them with a route helper or equivalent Pages-safe navigation contract.
2. Preserve the multi-entry build output and direct page linking.
3. Ensure refresh and direct-entry access work for:
   - landing page
   - master page
   - facilitator page
   - notetaker page
   - whitecell page
4. Add a GitHub Pages workflow that publishes the built `dist/` folder.
5. If a project-site path assumption must be encoded anywhere, centralize it rather than duplicating string logic across controllers.
6. Do not break local dev or Playwright test execution while making Pages-compatible navigation work.
7. Add a short operator note describing the expected Pages project URL shape and any repo-slug dependency.

When done, summarize:
- which route assumptions were removed
- how Pages-safe navigation now works
- what workflow or deployment files were added
```

**You run:**

```bash
npm run build
npm test -- --run
npm run test:e2e
```
Completed 7 April
---

## Prompt 2 - Split public participant access from operator-only surfaces

```text
Read the landing page, team-context helpers, session store, Game Master page, and White Cell role controller.

Enforce the live-demo role model:
- public join by session code for Facilitator, Notetaker, and Observer
- operator-only access for White Cell and Game Master

Work in these files first:
- index.html
- src/roles/landing.js
- src/core/teamContext.js
- src/stores/session.js
- src/roles/whitecell.js
- src/roles/gamemaster.js
- master.html

Requirements:
1. Remove White Cell from the public landing join options.
2. Keep Observer available, but enforce read-only behavior in code and not just UI labels.
3. Add an operator-only access model for:
   - Game Master
   - White Cell
4. Block direct navigation to operator surfaces if the current session lacks operator auth.
5. Update copy and labels so the landing page no longer implies that session-code participants may claim White Cell.
6. Preserve the current team-scoped observer routing model if it remains valid, but make the role boundaries explicit.
7. Add tests for:
   - public participant role visibility
   - blocked direct access to operator pages
   - observer read-only enforcement

When done, summarize:
- which public roles remain
- how operator-only access is enforced
- which misleading role-entry paths were removed
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 3 - Replace browser-side session discovery with secure session-code join

```text
Read the current landing join flow, database service, Supabase service, and schema files.

Replace browser-side active-session discovery with a secure server-side join path that still preserves the low-friction UX of "enter a session code and join."

Work in these files first:
- src/roles/landing.js
- src/services/database.js
- src/services/supabase.js
- data/COMPLETE_SCHEMA.sql
- new SQL migration file under data/

Requirements:
1. Stop downloading all active sessions into the browser and filtering by `metadata.session_code`.
2. Create a Supabase RPC or equivalent server-side function that:
   - looks up a session by code
   - validates that it is joinable
   - returns only the session data the participant needs
3. Establish a real Supabase-authenticated browser identity before any join or write path, using the lowest-friction model that works from GitHub Pages.
4. Keep session-code join open for participants, but do not expose session inventory in public clients.
5. Update the frontend join path to call the new server-side contract.
6. Record the new join contract in code comments or an operator note so future prompts do not revert to browser-side listing.
7. Add tests for:
   - successful join by valid code
   - failed join by invalid code
   - no session enumeration leak from the public client flow

When done, summarize:
- the new join contract
- how browser-side session discovery was removed
- what auth/bootstrap path now exists before join
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 4 - Harden role claiming, seat limits, and disconnect recovery for live capacity

```text
Read the current participant registration logic, participant store, session store, heartbeat handling, and config role limits.

Implement the actual live-demo seat model and make role claiming reliable.

Work in these files first:
- src/core/config.js
- src/services/database.js
- src/stores/participants.js
- src/stores/session.js
- src/main.js
- src/roles/landing.js
- data/COMPLETE_SCHEMA.sql
- new SQL migration file under data/

Requirements:
1. Replace client-side precheck-only role claiming with an atomic server-side claim flow.
2. Support the live-demo target for one team:
   - facilitator: 1
   - notetaker: 4
   - observer: 5 or a clearly documented unlimited/read-only model if that is safer
   - White Cell operators: 2 total, but not public
3. Split the two White Cell operator seats into explicit role semantics such as:
   - lead operator
   - support operator
   so the build does not allow two identical full-control users to race on the same controls by accident.
4. Align timeout values across frontend and backend so "active participant" means the same thing everywhere.
5. Replace dead unload behavior with a real disconnect path using Supabase-compatible keepalive or RPC behavior.
6. Ensure stale sessions free role slots automatically.
7. Update participant counts and role visibility so operator and participant views reflect the new seat rules honestly.
8. Add tests for:
   - seat claim success
   - duplicate claim rejection
   - stale seat release
   - disconnect and rejoin

When done, summarize:
- the final seat model
- how claim races are prevented
- how disconnect and stale-seat recovery now behave
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 5 - Enforce real server-side policies for the live demo

```text
Read the current schema policies, operator access rules, and all privileged write paths.

Harden the current Supabase project so the live demo does not trust client-side role strings.

Work in these files first:
- data/COMPLETE_SCHEMA.sql
- new SQL migration file under data/
- src/services/database.js
- src/services/supabase.js
- src/stores/session.js
- src/roles/whitecell.js
- src/roles/gamemaster.js

Requirements:
1. Replace "allow all operations" policies with restrictive RLS and/or RPC contracts.
2. Ensure participant users may only read and write within the session they joined.
3. Ensure Observers cannot perform write actions.
4. Ensure White Cell and Game Master privileged operations require operator auth and cannot be unlocked by editing browser storage.
5. Move the most sensitive operations behind RPCs or equivalent protected backend paths, including:
   - role claim
   - move/phase changes
   - timer control
   - adjudication
   - operator-only communications if applicable
6. Keep the current Supabase project, but make its live-demo policy model explicit and reviewable in committed SQL.
7. Add tests for policy-driven denial paths wherever the current test setup can support them, and document any remaining manual verification needed.

When done, summarize:
- which policies were replaced
- which actions now require protected backend paths
- how client-side role spoofing is blocked
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 6 - Wire the shipped role pages to real-time sync and shared state

```text
Read the sync service, realtime service, session store, and the role controllers.

Make the shipped pages actually use the real-time/store layer that already exists instead of relying on mixed polling and one-time loads.

Work in these files first:
- src/services/sync.js
- src/services/realtime.js
- src/main.js
- src/roles/facilitator.js
- src/roles/notetaker.js
- src/roles/whitecell.js
- src/roles/gamemaster.js
- src/stores/session.js

Requirements:
1. Initialize sync after successful auth and join, not just after page load assumptions.
2. Ensure facilitator, observer, notetaker, White Cell, and Game Master views all receive real updates from the same store model.
3. Remove duplicated or conflicting heartbeat/presence loops if sync or the participant store already covers that behavior.
4. Keep shared header move, phase, and timer state consistent across all active pages.
5. Ensure White Cell control changes propagate immediately to participant pages.
6. Keep public participant flows responsive under live conditions; avoid slow polling as the primary update mechanism.
7. Add tests that lock the chosen sync model so later prompts do not silently fall back to one-off data loading.

When done, summarize:
- how sync is initialized
- which pages now receive live updates
- what polling or duplicate update paths were removed
```

**You run:**

```bash
npm run build
npm test -- --run
npm run test:e2e
```
Completed 7 April
---

## Prompt 7 - Make multi-notetaker and observer behavior safe for concurrent live use

```text
Read the Notetaker controller, notetaker database methods, facilitator observer mode, and any move-scoped summary behavior.

Make the participant experience safe for 4 concurrent notetakers and 5 read-only observers.

Work in these files first:
- src/roles/notetaker.js
- src/services/database.js
- src/features/notetaker/
- src/roles/facilitator.js
- teams/blue/notetaker.html
- teams/blue/facilitator.html

Requirements:
1. Prevent 4 concurrent notetakers from silently overwriting the same move-scoped state.
2. Make capture/event logging append intentionally per participant or per entry rather than replacing shared blobs.
3. If shared dynamics or alliance summaries remain single-record data, define one explicit ownership rule or merge strategy rather than pretending free concurrent editing is safe.
4. Ensure observer mode is truly read-only in code:
   - no create
   - no edit
   - no submit
   - no delete
   - no hidden write handler escape paths
5. Update labels and help text so observers understand the page is passive.
6. Add tests for:
   - observer write blocking
   - notetaker save/load behavior under the new concurrency contract

When done, summarize:
- how 4 notetakers can now work safely
- what shared-data ownership rule was chosen
- how observer mode is enforced in code
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 8 - Simplify the operator surface to what the live session actually needs

```text
Read the Game Master controller, current export code, package dependencies, and Vite build chunks.

Reduce the operator surface to the features required for the live demo and remove risky or unnecessary export behavior.

Work in these files first:
- src/roles/gamemaster.js
- master.html
- src/features/export/
- package.json
- vite.config.js

Requirements:
1. Keep JSON and CSV exports only.
2. Remove PDF, XLSX, and ZIP export UI and dead handlers from the live operator surface.
3. Remove or stop bundling dependencies that are no longer required once PDF/XLSX are gone.
4. Keep Game Master dashboard panels truthful:
   - real session data
   - real participant counts
   - real recent activity
   - clear empty states
5. Ensure the master surface continues to work under the operator-only access model.
6. Add tests for:
   - export button wiring
   - export availability when no session is selected
   - absence of removed dead controls

When done, summarize:
- which export formats remain
- which dependencies or handlers were removed
- how the operator surface is simpler and safer now
```

**You run:**

```bash
npm run build
npm test -- --run
```
Completed 7 April
---

## Prompt 9 - Add meaningful coverage and a rehearsal workflow for the 12-user live demo

```text
Read the current test setup, Playwright smoke flow, and the final live-demo topology.

Expand coverage so the build is validated for the real demo model rather than only for a mock single-threaded happy path.

Work in these files first:
- tests/e2e/
- playwright.config.js
- package.json
- README.md
- any test support files needed

Requirements:
1. Preserve the existing fast smoke flow if it is still useful, but stop treating it as sufficient proof of live-demo readiness.
2. Add multi-context E2E coverage for the most important live-demo behaviors:
   - operator session creation
   - participant join by code
   - facilitator action submit
   - notetaker concurrent capture behavior
   - observer read-only behavior
   - operator-only White Cell access
   - role-seat rejection or contention paths
   - disconnect and seat recovery
3. Add a documented rehearsal workflow for the one-team live target:
   - 1 facilitator
   - 4 notetakers
   - 2 White Cell operators
   - 5 observers
4. Record what must be validated manually against the real Supabase backend if it cannot be fully covered in automated tests.
5. Update the README with a short operator runbook for:
   - Pages URL
   - session creation
   - participant onboarding
   - operator login
   - export limitations
   - recovery steps if a seat gets stuck

When done, summarize:
- what is now covered by automated tests
- what the rehearsal workflow looks like
- what still requires manual live verification
```

**You run:**

```bash
npm test -- --run
npm run test:e2e
npm run build
```
Completed 7 April
---

## Exit Criteria For This Book

Use this book until all of the following are true:

- the app deploys and navigates correctly from a GitHub Pages project-site path
- public participants join by session code without browser-side session enumeration
- White Cell and Game Master are operator-only in both UI and backend enforcement
- role claiming is atomic and matches the live seat model
- facilitator, notetaker, observer, White Cell, and Game Master pages receive real-time updates
- 4 notetakers can work without silent overwrite behavior
- observers are truly read-only in code
- JSON and CSV exports work and no longer expose dead PDF/XLSX controls
- `npm run build` passes
- `npm test -- --run` passes
- `npm run test:e2e` covers meaningful cross-role behavior beyond the narrow mock smoke path
- a rehearsal workflow exists for the 12-user live demo topology

If those are not true, this book is still active.

---

## Completion Handoff

Once this book is complete, the team should have:

1. a GitHub Pages-hosted frontend that works under project-site paths
2. a current Supabase backend whose live-demo trust model is enforced server-side
3. a truthful participant/operator split aligned to the actual demo rules
4. a reliable live seat and presence model for the target participant load
5. simplified export and operator workflows that match the actual session needs
6. automated coverage and a live rehearsal path that reflect the real deployment

If any of those are still missing, do not declare the live demo ready.
