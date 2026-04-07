# Legacy Code Archive

This folder contains legacy code that has been superseded by the new `src/` module architecture.

## Why These Files Are Archived

The ESG platform was rebuilt using ES6 modules in the `src/` folder:
- `src/services/` - Database and realtime services
- `src/stores/` - State management stores
- `src/roles/` - Role-specific controllers
- `src/core/` - Configuration and enums
- `src/utils/` - Utility functions
- `src/features/` - Feature modules

## Files in This Archive

### JavaScript (Legacy)
- `data-layer.js` - Old unified data layer exposing `window.esg` API
- `facilitator.js` - Old facilitator controller
- `whitecell.js` - Old white cell controller
- `notetaker.js` - Old notetaker controller
- `gamemaster.js` - Old game master controller
- `app.js` - Old app entry point
- `autoSave.js` - Old auto-save functionality
- `loading.js` - Old loading indicators
- `modal-utils.js` - Old modal utilities
- `role-dialogs.js` - Old role dialog utilities
- `research-tracking.js` - Old research tracking
- `debug-helpers.js` - Old debug helpers

### CSS (Legacy)
- `blue_facilitator.css` - Old facilitator styles
- `blue_notetaker.css` - Old notetaker styles
- `blue_whitecell.css` - Old white cell styles
- `main.css` - Old main styles
- `master.css` - Old master styles
- `simulation-theme.css` - Old theme variables

## Do Not Use

These files are preserved for reference only. All active development should use the `src/` modules.

## Migration Notes

The `window.esg` global API from `data-layer.js` has been replaced with:
- `import { database } from '../services/database.js'`
- `import { sessionStore } from '../stores/session.js'`
- `import { gameStateStore } from '../stores/gameState.js'`
- etc.

Archived: January 2025
