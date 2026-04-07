# ESG Simulation Platform

## Runtime Configuration

This build runs in `backend-required` mode.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If either value is missing or left as a placeholder, the app blocks startup with a configuration notice on the landing page and control panel. Set the values from `.env.example`, restart the dev server, and reload the page.
