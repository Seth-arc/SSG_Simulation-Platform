# ESG Simulation Platform

## Runtime Configuration

This build runs in `backend-required` mode.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If either value is missing or left as a placeholder, the app blocks startup with a configuration notice on the landing page and control panel. Set the values from `.env.example`, restart the dev server, and reload the page.

## E2E Readiness Gates

- `npm run test:e2e:smoke`
  - Fast single-actor smoke on the mock backend.
  - Useful for quick breakage detection.
  - Not sufficient proof of live-demo readiness on its own.
- `npm run test:e2e:live-demo`
  - Multi-actor topology suite for the real demo seat model.
  - Covers facilitator, notetaker, observer, White Cell lead, White Cell support, seat contention, recovery paths, and a browser-level all-team role matrix.
- `npm run test:e2e:live-demo:matrix`
  - Targeted browser-level role matrix.
  - Verifies blue, red, and green facilitator, notetaker, observer, White Cell lead, and White Cell support joins survive bootstrap, reload, and operator-roster visibility.
- `npm run test:e2e`
  - Full automated gate.
  - Run this before treating a build as demo-ready.
- `npm run test:e2e:rehearsal`
  - Alias for the full live-demo gate when you want the rehearsal command explicitly.

Playwright serves the built `dist/` output through `npm run serve:test`. If you are validating fresh UI changes, rebuild before running the suite so `dist/` matches the current source.

You can point the suite at an already-hosted build by setting `PLAYWRIGHT_BASE_URL`, for example:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://<owner>.github.io/SSG_Simulation-Platform/'
npm run test:e2e:smoke
```

The automated E2E suite still uses the mock backend contract. Real Supabase verification is listed below.

## One-Team Rehearsal Workflow

Target staffing for the final one-team live demo:

- 1 facilitator
- 4 notetakers
- 2 White Cell operators
- 5 observers

Suggested rehearsal order:

1. Run `npm run test:e2e:smoke`.
2. Run `npm run test:e2e:live-demo`.
   - This now includes the all-team role matrix in addition to the one-team topology flow.
3. On the live Pages target, have the Game Master create one session and distribute the session code.
4. Join one facilitator, then four notetakers, then five observers on the same team.
5. Join White Cell Lead and White Cell Support with the operator access code.
6. Save a facilitator draft action, confirm observers can see it but cannot modify it, then submit it to White Cell.
7. Have at least two notetakers save different seat-scoped notes and shared captures at the same time.
8. Adjudicate the submitted action from White Cell Lead.
9. Disconnect one occupied seat, then rejoin it from a second browser.
10. Export the session bundle from Game Master and confirm the expected files download.

## Operator Runbook

### Pages URL

- Project Pages format: `https://<owner>.github.io/<repo-slug>/`
- For this repository, the expected slug is usually `SSG_Simulation-Platform`, so the URL shape is `https://<owner>.github.io/SSG_Simulation-Platform/`

### Session Creation

1. Open the Pages URL.
2. Enter an operator display name.
3. Enter the operator access code.
4. Click `Open Game Master`.
5. In `Session Management`, create a session name and a participant-facing session code.

### Participant Onboarding

1. Share the session code with the team.
2. Tell public participants to join only through `Facilitator`, `Notetaker`, or `Observer`.
3. For the one-team live target, fill seats in this order: facilitator, notetakers, observers.
4. Do not tell public users to use White Cell or Game Master paths. Those are operator-only.

### Operator Login

1. White Cell operators stay on the landing page.
2. Enter the session code and operator access code. White Cell no longer uses team selection.
3. Click `Open White Cell Lead` or `Open White Cell Support`.
4. Game Master uses only `Open Game Master`.

### Export Limitations

- Exports are available only from the Game Master surface.
- Current export formats are JSON and CSV only.
- The exported session bundle includes:
  - session metadata
  - game state
  - actions
  - RFIs
  - timeline
  - participants
- The exported bundle does not currently include:
  - `notetaker_data`
  - operator grants
  - Supabase auth records
  - audit trails
  - PDF or print-ready exports

### Recovery Steps If a Seat Gets Stuck

1. Ask the participant to click `Logout` first.
2. If the browser disappeared without logging out, wait for the heartbeat timeout window to expire.
   - Current backend timeout target: 90 seconds.
3. Refresh the join page and retry the same seat.
4. If the seat is still blocked after the timeout, confirm the operator used the correct team and role before recreating the session as a last resort.

## Manual Live Supabase Verification

Validate these manually against the real backend because the automated suite does not fully cover them:

- Anonymous browser identity bootstrap on the deployed Pages build.
- Public facilitator, notetaker, and observer joins should succeed without ever returning `Session access is required.` If they do, reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql` from this repo before retrying.
- If the live backend returns `function public.release_stale_session_role_seats(uuid, integer) is not unique`, the older join hotfix created an overloaded function. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; it drops the bad overload and replaces it with the internal `release_stale_session_role_seats_internal` helper.
- If facilitator or notetaker heartbeats fail with `heartbeat_session_role_seat` 403 / `Session access is required.`, the live backend is still running the older heartbeat/disconnect function bodies. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; the updated patch moves heartbeat and disconnect cleanup onto the internal helper as well.
- If `game_state` reads return `GameState not found` for an active session, the session was created without its `game_state` row. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; it now backfills missing `game_state` rows for existing sessions. Recreate the session only if the row still does not appear afterward.
- If Game Master or White Cell operator authorization fails with `function digest(text, unknown) does not exist`, the live backend is resolving `pgcrypto.digest()` outside the `extensions` schema search path. Apply `data/2026-04-08_operator_auth_digest_fix.sql`, then retry operator login.
- If White Cell operator authorization still expects a team-scoped role such as `blue_whitecell_lead`, apply `data/2026-04-09_global_white_cell_role_contract.sql`, then retry operator login.
- If public facilitator, notetaker, or observer joins started failing with `claim_session_role_seat` 403 / `Session access is required.` after the White Cell role contract update, reapply the current `data/2026-04-09_global_white_cell_role_contract.sql`; the corrected version preserves the internal stale-seat cleanup helper inside `claim_session_role_seat`.
- Server-side RPC and RLS enforcement for:
  - operator authorization
  - join-by-code lookup
  - seat claims
  - seat rejection
  - White Cell-only actions
- Realtime propagation across separate browsers without page reloads.
- Hard disconnect handling after closing a tab or losing network, including stale seat release after 90 seconds.
- White Cell lead and support grants surviving reloads on the live backend.
- Export downloads from the deployed Game Master page with live backend data.
- Base-path correctness on the actual Pages deployment URL.

## GitHub Pages Operator Note

This build targets a GitHub Pages project site URL shaped like `https://<owner>.github.io/<repo-slug>/`.

The Pages deployment workflow sets `VITE_PUBLIC_BASE_PATH=/<repo-slug>/` from the repository name so multi-page routes resolve under the repo slug. If you deploy this build anywhere else, override `VITE_PUBLIC_BASE_PATH` to the correct base path, such as `/` for a root site or custom domain.

## GitHub Pages Bootstrap

On a brand-new repository, the first Pages deployment can fail at `actions/configure-pages` with `Get Pages site failed` if GitHub Pages has never been enabled for the repo.

Use one of these paths:

- Recommended one-time setup: in `Settings > Pages`, set the source to `GitHub Actions`, then rerun the workflow.
- Automated bootstrap: add a repository secret named `PAGES_ENABLEMENT_TOKEN` containing a token that can enable Pages for the repository. The workflow will use it to turn on Pages automatically when needed.

Without one of those, the deploy workflow cannot create the Pages site on its own with the default `GITHUB_TOKEN`.
