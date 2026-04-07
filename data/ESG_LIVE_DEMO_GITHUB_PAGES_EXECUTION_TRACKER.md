# ESG Live Demo GitHub Pages Execution Tracker

> Companion tracker for [ESG_LIVE_DEMO_GITHUB_PAGES_PROMPT_BOOK.md](C:/Users/ssnguna/Local%20Sites/SSG_Simulation-Platform/data/ESG_LIVE_DEMO_GITHUB_PAGES_PROMPT_BOOK.md)
>
> Use this file to track execution status, evidence, blockers, and sign-off for the GitHub Pages live-demo hardening work.

---

## How To Use This Tracker

1. Work the prompts in order unless a blocker forces a dependency change.
2. Update the status table before and after each prompt.
3. Record evidence for every completed prompt:
   - files changed
   - commands run
   - tests passed
   - manual validation notes
4. Do not mark a prompt complete just because code was written. Mark it complete only when its validation and acceptance checks are satisfied.
5. If a prompt changes scope or assumptions, record that in the decision log before continuing.

---

## Status Legend

- `NOT_STARTED`: no implementation work has begun
- `IN_PROGRESS`: active implementation is underway
- `BLOCKED`: cannot proceed until an upstream dependency or decision is resolved
- `READY_FOR_REVIEW`: implementation is finished and awaiting validation or sign-off
- `DONE`: implementation and validation are complete
- `DEFERRED`: intentionally moved out of the live-demo scope

---

## Locked Demo Assumptions

- Frontend host: GitHub Pages project site
- Backend: current Supabase project
- Public participant join: session code only
- Operator-only roles: White Cell and Game Master
- Required exports: JSON and CSV only
- One-team live target:
  - 1 facilitator
  - 4 notetakers
  - 2 White Cell operators
  - 5 observers
- `src/` remains the canonical codebase

---

## Project Metadata

- GitHub Pages repo slug: `SSG_Simulation-Platform`
- Expected Pages URL pattern: `https://<owner>.github.io/SSG_Simulation-Platform/`
- Current baseline build status: `npm run build` passes
- Current baseline unit test status: `npm test -- --run` passes
- Current baseline E2E status: `npm run test:e2e` passes, but only for a narrow mock-backed smoke flow
- Tracker owner: `________________`
- Last updated: `________________`

---

## Master Status Board

| Prompt | Objective | Status | Owner | Evidence Recorded |
|---|---|---|---|---|
| 1 | GitHub Pages-safe deployment and routing | NOT_STARTED |  | No |
| 2 | Public participant access vs operator-only surfaces | NOT_STARTED |  | No |
| 3 | Secure session-code join without browser-side enumeration | NOT_STARTED |  | No |
| 4 | Atomic role claiming, seat limits, and disconnect recovery | NOT_STARTED |  | No |
| 5 | Server-side Supabase enforcement and protected operations | NOT_STARTED |  | No |
| 6 | Real-time sync wired into shipped pages | NOT_STARTED |  | No |
| 7 | Safe concurrent notetaker and observer behavior | NOT_STARTED |  | No |
| 8 | JSON/CSV-only operator surface and export simplification | NOT_STARTED |  | No |
| 9 | Coverage expansion and 12-user rehearsal workflow | NOT_STARTED |  | No |

---

## Global Go/No-Go Gates

Mark each gate only when verified.

- [ ] GitHub Pages project-site deployment works from the real published URL
- [ ] All redirects and direct page loads work under `/<repo-slug>/`
- [ ] Public participants can join by session code without session enumeration
- [ ] White Cell is no longer publicly claimable
- [ ] Game Master is protected behind operator-only access
- [ ] Seat claiming is atomic and race-safe
- [ ] Presence and disconnect logic frees stale seats reliably
- [ ] Facilitator, notetaker, observer, White Cell, and Game Master pages all receive live updates
- [ ] 4 notetakers can operate without silent overwrite behavior
- [ ] Observer mode is read-only in code
- [ ] JSON export works
- [ ] CSV export works
- [ ] PDF/XLSX/ZIP controls are removed or disabled
- [ ] `npm run build` passes after all changes
- [ ] `npm test -- --run` passes after all changes
- [ ] `npm run test:e2e` covers meaningful cross-role behavior
- [ ] 12-user rehearsal workflow is documented
- [ ] Real-backend rehearsal has been executed and recorded

---

## Prompt 1 Tracker

**Prompt:** GitHub Pages-safe deployment and routing

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] All hard-coded absolute routes are removed or centralized
- [ ] Direct entry works for landing, master, facilitator, notetaker, and whitecell pages
- [ ] Refresh works under the GitHub Pages project-site path
- [ ] GitHub Pages deployment workflow exists and publishes `dist/`
- [ ] Local dev and Playwright execution still work

**Implementation checklist**
- [ ] Audit route assumptions in `src/main.js`
- [ ] Audit route assumptions in `src/roles/landing.js`
- [ ] Audit route assumptions in `src/roles/facilitator.js`
- [ ] Audit route assumptions in `src/roles/notetaker.js`
- [ ] Audit route assumptions in `src/roles/whitecell.js`
- [ ] Audit route assumptions in `src/roles/gamemaster.js`
- [ ] Add a centralized route helper
- [ ] Add GitHub Pages workflow under `.github/workflows/`
- [ ] Add or update deployment note in `README.md`

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 2 Tracker

**Prompt:** Public participant access vs operator-only surfaces

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] White Cell is removed from public role selection
- [ ] Observer remains available and is code-enforced read-only
- [ ] Direct route access to operator pages is blocked for non-operators
- [ ] Landing page copy no longer implies public White Cell access
- [ ] Tests cover operator page protection and observer behavior

**Implementation checklist**
- [ ] Update `index.html`
- [ ] Update `src/roles/landing.js`
- [ ] Update `src/core/teamContext.js`
- [ ] Update `src/stores/session.js`
- [ ] Update `src/roles/whitecell.js`
- [ ] Update `src/roles/gamemaster.js`
- [ ] Update `master.html`
- [ ] Add tests for operator-route blocking
- [ ] Add tests for observer read-only enforcement

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 3 Tracker

**Prompt:** Secure session-code join without browser-side enumeration

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] Browser no longer downloads all active sessions for public join
- [ ] Session-code lookup is performed through a protected backend path
- [ ] Browser identity is established before join/write operations
- [ ] Invalid session codes fail cleanly
- [ ] Tests cover successful join, invalid join, and no session enumeration leak

**Implementation checklist**
- [ ] Design auth/bootstrap path for GitHub Pages frontend
- [ ] Add `join_session_by_code` RPC or equivalent
- [ ] Update `src/services/database.js` to use the new contract
- [ ] Update `src/roles/landing.js` to stop filtering active sessions client-side
- [ ] Add SQL migration file for RPC/policy support
- [ ] Add tests for the join path

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 4 Tracker

**Prompt:** Atomic role claiming, seat limits, and disconnect recovery

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] Server-side claim path is atomic
- [ ] Seat caps match the live-demo target
- [ ] White Cell operator seats are split into explicit role semantics
- [ ] Timeout rules are aligned across frontend and backend
- [ ] Disconnect and stale-seat release are verified
- [ ] Tests cover claim, rejection, disconnect, and recovery

**Seat model target**
- [ ] Facilitator = 1
- [ ] Notetaker = 4
- [ ] Observer = 5 or documented unlimited model
- [ ] White Cell lead operator = 1
- [ ] White Cell support operator = 1

**Implementation checklist**
- [ ] Update `src/core/config.js`
- [ ] Update `src/services/database.js`
- [ ] Update `src/stores/participants.js`
- [ ] Update `src/stores/session.js`
- [ ] Update `src/main.js`
- [ ] Update `src/roles/landing.js`
- [ ] Add SQL support for claim/disconnect paths
- [ ] Add tests for role-seat behavior

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 5 Tracker

**Prompt:** Server-side Supabase enforcement and protected operations

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] Open-all RLS policies are removed or replaced
- [ ] Participants are limited to their own joined session context
- [ ] Observers cannot write
- [ ] White Cell and Game Master actions require operator auth
- [ ] Sensitive operations are behind protected RPCs or equivalent backend paths
- [ ] Manual verification exists for denial cases that are hard to automate

**Protected operations**
- [ ] Role claim
- [ ] Move change
- [ ] Phase change
- [ ] Timer control
- [ ] Adjudication
- [ ] Operator-only communications

**Implementation checklist**
- [ ] Update `data/COMPLETE_SCHEMA.sql`
- [ ] Add migration SQL for new policies and RPCs
- [ ] Update `src/services/database.js`
- [ ] Update `src/services/supabase.js`
- [ ] Update `src/stores/session.js`
- [ ] Update `src/roles/whitecell.js`
- [ ] Update `src/roles/gamemaster.js`
- [ ] Add or update tests

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 6 Tracker

**Prompt:** Real-time sync wired into shipped pages

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] Sync initializes after auth and join
- [ ] Facilitator receives live updates
- [ ] Observer receives live updates
- [ ] Notetaker receives live updates
- [ ] White Cell receives live updates
- [ ] Game Master receives live updates
- [ ] Duplicate heartbeat/presence loops are removed
- [ ] Shared header state stays in sync

**Implementation checklist**
- [ ] Update `src/services/sync.js`
- [ ] Update `src/services/realtime.js`
- [ ] Update `src/main.js`
- [ ] Update `src/roles/facilitator.js`
- [ ] Update `src/roles/notetaker.js`
- [ ] Update `src/roles/whitecell.js`
- [ ] Update `src/roles/gamemaster.js`
- [ ] Update `src/stores/session.js`
- [ ] Add tests for the chosen sync model

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 7 Tracker

**Prompt:** Safe concurrent notetaker and observer behavior

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] 4 notetakers can save without silent overwrite behavior
- [ ] Capture/event logging uses append-safe semantics where appropriate
- [ ] Any remaining shared-summary behavior has an explicit ownership or merge rule
- [ ] Observer mode is fully read-only in code
- [ ] Tests cover observer write blocking and notetaker save/load behavior

**Implementation checklist**
- [ ] Update `src/roles/notetaker.js`
- [ ] Update `src/services/database.js`
- [ ] Update files under `src/features/notetaker/`
- [ ] Update `src/roles/facilitator.js`
- [ ] Update `teams/blue/notetaker.html`
- [ ] Update `teams/blue/facilitator.html`
- [ ] Add or update tests

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 8 Tracker

**Prompt:** JSON/CSV-only operator surface and export simplification

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] JSON export works
- [ ] CSV export works
- [ ] PDF export controls are removed
- [ ] XLSX export controls are removed
- [ ] ZIP export controls are removed
- [ ] Dead dependencies are removed or no longer bundled
- [ ] Master dashboard remains truthful and usable

**Implementation checklist**
- [ ] Update `src/roles/gamemaster.js`
- [ ] Update `master.html`
- [ ] Update files under `src/features/export/`
- [ ] Update `package.json`
- [ ] Update `vite.config.js`
- [ ] Add or update export tests

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Prompt 9 Tracker

**Prompt:** Coverage expansion and 12-user rehearsal workflow

**Status:** `NOT_STARTED`

**Acceptance checks**
- [ ] Existing smoke flow remains useful or is intentionally replaced
- [ ] Multi-context E2E covers meaningful live-demo behavior
- [ ] README includes a short operator runbook
- [ ] Rehearsal workflow is documented for the 12-user topology
- [ ] Manual real-backend validation steps are recorded

**Coverage targets**
- [ ] Operator session creation
- [ ] Participant join by code
- [ ] Facilitator action submit
- [ ] Notetaker concurrent capture behavior
- [ ] Observer read-only behavior
- [ ] Operator-only White Cell access
- [ ] Role-seat rejection or contention
- [ ] Disconnect and seat recovery

**Implementation checklist**
- [ ] Update `tests/e2e/`
- [ ] Update `playwright.config.js`
- [ ] Update `package.json` if needed
- [ ] Update `README.md`
- [ ] Add any missing test support files
- [ ] Record manual rehearsal instructions

**Evidence**
- Files changed:
- Commands run:
- Manual validation:

**Blockers**
- `________________`

**Sign-off**
- Implementer:
- Reviewer:
- Date:

---

## Decision Log

Use this section to record any scope or implementation decision that changes how later prompts should be executed.

| Date | Decision | Reason | Impacted Prompts | Recorded By |
|---|---|---|---|---|
|  |  |  |  |  |

---

## Blocker Log

Use this section to record blockers that pause execution.

| Date | Prompt | Blocker | Required Resolution | Owner | Cleared |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

---

## Validation Log

Record each validation run with outcome and notes.

| Date | Prompt | Command or Validation | Result | Notes |
|---|---|---|---|---|
|  |  | `npm run build` |  |  |
|  |  | `npm test -- --run` |  |  |
|  |  | `npm run test:e2e` |  |  |

---

## Rehearsal Record

Complete this section when the real-backend rehearsal is executed.

**Rehearsal date:** `________________`

**Pages URL used:** `________________`

**Supabase environment used:** `current project`

**Participants present**
- Facilitator count:
- Notetaker count:
- White Cell lead count:
- White Cell support count:
- Observer count:

**Scenarios executed**
- [ ] Operator creates session
- [ ] Participants join by code
- [ ] Facilitator submits action
- [ ] White Cell adjudicates action
- [ ] Notetakers capture concurrently
- [ ] Observers verify read-only behavior
- [ ] Disconnect and seat recovery tested
- [ ] JSON export tested
- [ ] CSV export tested

**Issues found**
- `________________`

**Rehearsal outcome**
- [ ] Pass
- [ ] Pass with follow-up fixes required
- [ ] Fail, live demo not ready

**Recorded by:** `________________`

---

## Final Release Readiness Check

Mark this section only when the team is prepared to declare the GitHub Pages live demo ready.

- [ ] Prompt 1 is `DONE`
- [ ] Prompt 2 is `DONE`
- [ ] Prompt 3 is `DONE`
- [ ] Prompt 4 is `DONE`
- [ ] Prompt 5 is `DONE`
- [ ] Prompt 6 is `DONE`
- [ ] Prompt 7 is `DONE`
- [ ] Prompt 8 is `DONE`
- [ ] Prompt 9 is `DONE`
- [ ] All global go/no-go gates are checked
- [ ] Rehearsal record is completed
- [ ] No unresolved blocker remains in the blocker log

**Release decision**
- [ ] GO
- [ ] NO_GO

**Approved by:** `________________`

**Date:** `________________`
