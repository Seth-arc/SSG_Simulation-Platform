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
  - Covers facilitator, notetaker, observer, White Cell lead, White Cell support, seat contention, and recovery paths.
- `npm run test:e2e`
  - Full automated gate.
  - Run this before treating a build as demo-ready.
- `npm run test:e2e:rehearsal`
  - Alias for the live-demo topology suite when you want the rehearsal gate explicitly.

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
2. Enter the session code, pick the correct team, enter the operator access code.
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
