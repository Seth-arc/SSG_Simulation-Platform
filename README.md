# ESG Simulation Platform

## Runtime Configuration

This build runs in `backend-required` mode.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If either value is missing or left as a placeholder, the app blocks startup with a configuration notice on the landing page and control panel. Set the values from `.env.example`, restart the dev server, and reload the page.

## GitHub Pages Operator Note

This build targets a GitHub Pages project site URL shaped like `https://<owner>.github.io/<repo-slug>/`.

The Pages deployment workflow sets `VITE_PUBLIC_BASE_PATH=/<repo-slug>/` from the repository name so multi-page routes resolve under the repo slug. If you deploy this build anywhere else, override `VITE_PUBLIC_BASE_PATH` to the correct base path, such as `/` for a root site or custom domain.

## GitHub Pages Bootstrap

On a brand-new repository, the first Pages deployment can fail at `actions/configure-pages` with `Get Pages site failed` if GitHub Pages has never been enabled for the repo.

Use one of these paths:

- Recommended one-time setup: in `Settings > Pages`, set the source to `GitHub Actions`, then rerun the workflow.
- Automated bootstrap: add a repository secret named `PAGES_ENABLEMENT_TOKEN` containing a token that can enable Pages for the repository. The workflow will use it to turn on Pages automatically when needed.

Without one of those, the deploy workflow cannot create the Pages site on its own with the default `GITHUB_TOKEN`.
