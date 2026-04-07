# ESG Code Remediation Plan (Updated Schema Alignment)

**Date:** Jan 23, 2026  
**Scope:** Align codebase to updated Supabase schema and deliver complete, production‑grade feature set.  
**Architecture:** `src/` modules are canonical; legacy is archived under `data/_legacy/`.

---

## Shipped Scope Decision

- The shipped role surface for this version is explicitly multi-team: Blue, Red, and Green all ship now.
- Each team ships three role pages: Facilitator, Notetaker, and White Cell.
- Observer access is team-scoped and routes to the selected team facilitator page in read-only mode.
- Landing copy, role selection, and Vite build inputs must stay aligned with those nine team pages plus `master.html`.
- Future prompts should not reopen whether Red and Green are in scope for this build. The remaining open work is deeper team-specific mechanics, not whether the route surface exists.

---

## Status Snapshot (code scan)

**Completed (code changes observed):**
- [x] Issue #2: Presence architecture uses `session_participants` (DB + store + realtime)
- [x] Issue #3: RFI creation and status enum alignment (priority/categories/query)
- [x] Issue #7: `src/` is authoritative; legacy archived
- [x] Issue #8: Flat database API usage in stores/features
- [x] Issue #1: runtime field mapping (current_* → move/phase/timer_last_update)
- [x] Issue #4: type/content fallback for legacy timeline fields

**Gaps / partials (must resolve):**
- [ ] Issue #1: no migration script; schema source of truth not verified
- [ ] Issue #4: callers do not populate `category`, `faction_tag`, `debate_marker`
- [ ] Issue #5: actions form/store still use legacy fields; DB insert expects new fields
- [ ] Issue #6: notetaker persistence mismatched (data_type vs JSONB columns)
- [ ] Issue #9/#10/#17: UI ID/container mismatches
- [ ] Issue #13: game_state_transitions not logged; logTransition columns wrong
- [ ] Issue #16: disconnect flow still uses `sendBeacon('/api/heartbeat')`
- [ ] Issues #12/#14/#15/#18: missing features

---

## Phase 0: Schema Lock + Migration (Foundation)

**Goal:** Verify and enforce the updated schema across Supabase and code.

**Tasks (Schema + Migration):**
- [ ] Confirm source of truth:
  - [ ] Compare `data/COMPLETE_SCHEMA.sql` to live Supabase schema
  - [ ] Decide canonical names: `responded_at` vs `answered_at`, communications `type` enum, etc.
- [ ] Create migration script (SQL) for legacy → updated columns:
  - [ ] Rename `current_move/current_phase/last_update` → `move/phase/timer_last_update` in `game_state`
  - [ ] Add missing columns: `actions.targets[]`, `actions.goal`, `actions.expected_outcomes`, `actions.ally_contingencies`, `actions.exposure_type`, `actions.priority`
  - [ ] Add missing columns: `requests.response`, `requests.responded_by`, `requests.responded_at`
  - [ ] Add missing columns: `timeline.category`, `timeline.faction_tag`, `timeline.debate_marker`
  - [ ] Add missing columns: `notetaker_data.observation_timeline`, `notetaker_data.team`, `notetaker_data.phase`
- [ ] Backfill existing rows:
  - [ ] Map legacy action fields to new (`title/description/target` → `goal/expected_outcomes/targets`)
  - [ ] Map legacy timeline fields (`event_type/description` → `type/content`)
- [ ] Re-run Supabase realtime publication to include all tables.

**Files:**
- `data/COMPLETE_SCHEMA.sql`
- `data/PROJECT_SPECIFICATION.md` (reference only)
- New migration SQL (to be created)

**Validation:**
- [ ] Inserts/updates using updated columns succeed
- [ ] Legacy data is visible in new fields
- [ ] Realtime subscriptions work for all tables

---

## Phase 1: Critical Data Alignment (Actions, Notetaker, Timeline)

### 1.1 Actions Schema Fix (Issue #5)

**Goal:** Actions create/edit/adjudication fully aligned to schema.

**Tasks:**
- [ ] Update action forms to collect required fields
  - [ ] Add `targets[]` multi-select
  - [ ] Add `exposure_type` (enum)
  - [ ] Add `goal`, `expected_outcomes`, `ally_contingencies`
- [ ] Update actions payloads to include `team`, `priority`, `exposure_type`
- [ ] Add form validation using `validateAction`
- [ ] Update action rendering to show new fields
- [ ] Fix status enum usage (`ENUMS.ACTION_STATUS` must be object or remove enum use)

**Files:**
- `src/roles/facilitator.js` (form + payload)
- `src/features/actions/ActionForm.js` (form fields + validation)
- `src/features/actions/ActionCard.js` (render new fields)
- `src/features/actions/ActionList.js` (filters/search fields)
- `src/roles/whitecell.js` (render + adjudication)
- `src/roles/notetaker.js` (read-only rendering)
- `src/stores/actions.js` (status enum fix)
- `src/core/enums.js` (ACTION_STATUS format)
- `src/services/database.js` (createAction includes team/priority/exposure_type)

**Validation:**
- [ ] Action create/save succeeds with required fields
- [ ] Draft/submit/adjudicate lifecycle works
- [ ] UI renders new schema fields correctly

---

### 1.2 Notetaker Persistence Fix (Issue #6)

**Goal:** Notetaker data stores/retrieves using schema JSONB columns.

**Tasks:**
- [ ] Replace `data_type` based persistence with schema columns
- [ ] Upsert on `(session_id, move)` in `database.saveNotetakerData`
- [ ] Add `team` and `phase` to notetaker saves
- [ ] Support `observation_timeline` JSONB array
- [ ] Update loaders to read `dynamics_analysis` and `external_factors`

**Files:**
- `src/services/database.js` (saveNotetakerData + fetchNotetakerData)
- `src/roles/notetaker.js` (save/load logic)
- `src/features/notetaker/TeamDynamics.js` (save/load fields)
- `src/features/notetaker/AllianceTracking.js` (save/load fields)

**Validation:**
- [ ] Notetaker edits persist across reloads
- [ ] Data stored per move with correct JSONB columns

---

### 1.3 Timeline Schema Completion (Issue #4)

**Goal:** Timeline events fully populated with new schema fields.

**Tasks:**
- [ ] Add support for `category`, `faction_tag`, `debate_marker` in event creation
- [ ] Update callers to include metadata where required
- [ ] Ensure filters can target category/faction

**Files:**
- `src/services/database.js` (already supports; ensure mapping)
- `src/stores/timeline.js` (normalize + expose category)
- `src/features/timeline/TimelineView.js` (category filters if needed)
- `src/roles/whitecell.js` (event creation)
- `src/roles/facilitator.js` (captures)
- `src/roles/notetaker.js` (captures)

**Validation:**
- [ ] Timeline entries include category/faction/debate_marker where expected
- [ ] Filtering works correctly

---

## Phase 2: UI/DOM Alignment (Issue #9/#10/#17)

**Goal:** Fix DOM ID mismatches and missing containers.

**Tasks:**
- [ ] White Cell IDs: update `whitecell.js` or HTML to match
  - `gameTimerDisplay` → `controlTimerDisplay`
  - `currentMoveDisplay` → `currentMove`
  - `actionsReviewList` → `actionsList`
  - `rfiQueueList` → `rfiQueue`
  - `actionReviewBadge` → `actionsBadge`
- [ ] Game Master export buttons:
  - Add `exportPdfBtn` and `refreshSessionsBtn` or update JS to match existing IDs
- [ ] Facilitator captures:
  - Add `<div id="recentCaptures"></div>` or remove render logic

**Files:**
- `src/roles/whitecell.js`
- `teams/blue/whitecell.html`
- `src/roles/gamemaster.js`
- `master.html`
- `src/roles/facilitator.js`
- `teams/blue/facilitator.html`

**Validation:**
- [ ] All role UIs update data dynamically
- [ ] No missing element errors in console

---

## Phase 3: Presence, Realtime, Sync (Issue #13/#16 + stability)

**Goal:** Make realtime and presence reliable and consistent.

**Tasks:**
- [ ] Initialize `syncService` after session join
- [ ] Choose single heartbeat strategy and remove duplicates
- [ ] Align heartbeat timeout values between DB and frontend
- [ ] Implement Supabase RPC `mark_participant_inactive`
- [ ] Replace `sendBeacon('/api/heartbeat')` with RPC call
- [ ] Update `logTransition` to match schema columns
- [ ] Call `logTransition` on move/phase advances

**Files:**
- `src/main.js` (init sync + disconnect)
- `src/services/sync.js` (init hooks)
- `src/services/heartbeat.js` (if used)
- `src/services/database.js` (logTransition)
- `src/roles/whitecell.js` (advance move/phase)
- Supabase SQL (RPC)

**Validation:**
- [ ] Participants mark inactive on tab close
- [ ] Transitions logged in `game_state_transitions`
- [ ] Realtime sync updates stores in all role UIs

---

## Phase 4: Research Tables + Audit Logging (Issue #12)

**Goal:** Implement all research/analytics tables and integrate into flows.

**Tasks:**
- [ ] Add CRUD in `database.js`:
  - `action_logs`
  - `participant_activity`
  - `data_completeness_checks`
  - `action_relationships`
  - `rfi_action_links`
  - `reports`
  - `move_completions`
- [ ] Integrate logging calls:
  - Action create/submit/adjudicate → `action_logs`
  - RFI create/answer → `participant_activity`
  - Link RFIs to actions → `rfi_action_links`
  - Move completion → `move_completions`
  - Notetaker reports → `reports`

**Files:**
- `src/services/database.js`
- `src/stores/actions.js`
- `src/stores/requests.js`
- `src/stores/timeline.js`
- `src/roles/notetaker.js`
- `src/roles/facilitator.js`
- `src/roles/whitecell.js`

**Validation:**
- [ ] All research tables populate with live data
- [ ] No missing CRUD methods

---

## Phase 5: Export System (Issue #18)

**Goal:** Full‑fidelity exports for all tables and formats.

**Tasks:**
- [ ] Implement unified export service (`src/services/export.js`)
- [ ] Add XLSX + ZIP (bundle JSON/CSV/XLSX/PDF)
- [ ] Update export CSV columns to match schema
- [ ] Replace gamemaster ad‑hoc export with service
- [ ] Include all 17 tables in export

**Files:**
- `src/services/export.js` (new)
- `src/roles/gamemaster.js` (wire new service)
- `src/features/export/exportCsv.js` (schema‑accurate columns)
- `src/features/export/exportJson.js` (include all tables)
- `src/features/export/exportPdf.js` (field alignment)
- `master.html` (export buttons)

**Validation:**
- [ ] JSON/CSV/XLSX/PDF/ZIP exports include all schema tables
- [ ] Columns match schema fields

---

## Phase 6: Security Hardening (Issue #15)

**Goal:** Enforce role‑based access server‑side.

**Tasks:**
- [ ] Add RLS policies per table (role‑based)
- [ ] Create RPCs for privileged actions (advance move/phase, adjudicate, export)
- [ ] Move role enforcement out of localStorage
- [ ] Add middleware/guards for role‑specific pages

**Files:**
- Supabase SQL (RLS + RPC)
- `src/services/database.js`
- `src/stores/session.js`

**Validation:**
- [ ] Spoofed localStorage roles cannot perform privileged operations
- [ ] RLS blocks unauthorized writes

---

## Phase 7: Offline + Cross‑Tab Sync (Issue #14)

**Goal:** Robust offline behavior with local queue.

**Tasks:**
- [ ] Implement `src/services/offline.js`
- [ ] Queue failed writes for retry
- [ ] Add cross‑tab sync keys:
  - `esg:sharedState`
  - `esg:sharedTimer`
  - `_timelineUpdate`
- [ ] Add `storage` event listeners

**Files:**
- `src/services/offline.js` (new)
- `src/services/database.js`
- `src/stores/gameState.js`
- `src/stores/timeline.js`

**Validation:**
- [ ] App usable offline
- [ ] Updates replay on reconnect

---

## Phase 8: Quality, Observability, and Polish

**Tasks:**
- [ ] Add unit tests for stores/validators
- [ ] Add integration tests for database service
- [ ] Add E2E tests for role flows (facilitator → whitecell → notetaker)
- [ ] Add error monitoring + performance metrics
- [ ] Accessibility audit and fixes

**Files:**
- `src/` (tests to be added)
- test config (to be added)

---

## Open Questions
- [ ] Confirm canonical schema for responses: `responded_at` vs `answered_at`
- [ ] Confirm communications type enum (schema vs UI options)
- [ ] Decide if legacy action fields should be retained for backward compatibility
- [x] Viewer role behavior is fixed: team-scoped observer mode uses the matching facilitator page in read-only mode.

---

## Success Criteria
- [ ] All core flows (session, actions, RFI, timeline, notetaker) work end‑to‑end
- [ ] Real‑time sync is active on all role pages
- [ ] Exports cover all tables and match schema
- [ ] RLS prevents unauthorized access
- [ ] Offline queue works with retry
- [ ] No runtime errors from schema mismatches
