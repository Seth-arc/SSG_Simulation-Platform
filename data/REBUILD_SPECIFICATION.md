# ESG Economic Statecraft Simulation Platform - Rebuild Specification

**Version:** 2.0
**Purpose:** Complete rebuild of the ESG simulation platform with improved architecture, maintainability, and robustness
**Target Folder:** `/newbuild/`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack Recommendations](#3-technology-stack-recommendations)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Core Modules](#6-core-modules)
7. [Role-Based Features](#7-role-based-features)
8. [Data Flow Architecture](#8-data-flow-architecture)
9. [State Management](#9-state-management)
10. [Real-Time Synchronization](#10-real-time-synchronization)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [UI Components](#12-ui-components)
13. [Export & Reporting](#13-export--reporting)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases](#15-implementation-phases)
16. [Known Issues to Avoid](#16-known-issues-to-avoid)

---

## 1. Executive Summary

### What the Platform Does

The ESG Economic Statecraft Simulation Platform is a **multi-role, real-time wargaming application** that simulates economic competition scenarios. Teams make strategic decisions about economic tools (sanctions, export controls, trade policies) to achieve geopolitical objectives.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Session Management** | Create, join, and manage simulation sessions |
| **Strategic Actions** | Submit, review, and adjudicate economic actions |
| **Information Requests (RFIs)** | Request and receive information from White Cell |
| **Real-time Collaboration** | Multiple users participate simultaneously |
| **Team Dynamics Tracking** | Document decision-making processes |
| **Game State Control** | Manage moves (1-3), phases (1-5), and timer |
| **Data Export** | Export to JSON, CSV, XLSX, PDF, ZIP |

### User Roles

| Role | Purpose | Max Per Session |
|------|---------|-----------------|
| **Game Master** | Administrative control, session management | 1 |
| **Facilitator** | Submit actions and RFIs | 1 |
| **Notetaker** | Document observations and team dynamics | 2 |
| **White Cell** | Adjudicate actions, respond to RFIs, control game state | 1 |

---

## 2. Architecture Overview

### Current Architecture Problems

1. **Inconsistent Storage Keys** - Different key patterns between roles cause data sync failures
2. **Session ID Desync** - `const` declaration prevents session updates after initialization
3. **No Centralized State** - Each role manages state independently
4. **Mixed Concerns** - Data layer mixes Supabase operations, localStorage, and utilities
5. **No Type Safety** - Vanilla JS without TypeScript leads to runtime errors
6. **Duplicate Code** - Similar functions across facilitator.js, whitecell.js, notetaker.js

### Recommended New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Facilitator│  │Notetaker│  │WhiteCell│  │GameMaster│           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                    STATE MANAGEMENT LAYER                        │
│  ┌────────────────────────┴────────────────────────┐            │
│  │              Centralized Store                   │            │
│  │  - Session State    - Game State (move/phase)   │            │
│  │  - Actions          - Requests                  │            │
│  │  - Timeline         - Communications            │            │
│  └────────────────────────┬────────────────────────┘            │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                      DATA ACCESS LAYER                           │
│  ┌────────────────────────┴────────────────────────┐            │
│  │              Unified Data Service               │            │
│  │  - CRUD Operations   - Real-time Subscriptions  │            │
│  │  - Offline Queue     - Conflict Resolution      │            │
│  └────────────────────────┬────────────────────────┘            │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                     PERSISTENCE LAYER                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Supabase   │    │ localStorage │    │ IndexedDB    │       │
│  │  (Primary)   │    │  (Fallback)  │    │  (Offline)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Recommendations

### Option A: Modern Vanilla JS (Simpler)

```
Frontend:
├── Vanilla JavaScript (ES2022+)
├── Web Components for reusable UI
├── CSS Variables + CSS Modules
├── Vite (build tool)
└── JSDoc for type hints

Backend:
├── Supabase (PostgreSQL + Realtime)
└── Edge Functions (if needed)
```

### Option B: TypeScript + Framework (More Robust)

```
Frontend:
├── TypeScript
├── React or Svelte (lightweight)
├── Zustand or Jotai (state management)
├── TailwindCSS
├── Vite (build tool)
└── Vitest (testing)

Backend:
├── Supabase (PostgreSQL + Realtime)
└── Edge Functions (if needed)
```

### External Dependencies (Required)

| Library | Purpose | CDN/Package |
|---------|---------|-------------|
| @supabase/supabase-js | Database & Realtime | `@supabase/supabase-js@2` |
| xlsx | Excel export | `xlsx@0.18.5` |
| jspdf | PDF export | `jspdf@2.5.1` |
| jszip | ZIP bundling | `jszip@3.10.1` |

---

## 4. Project Structure

### Recommended Directory Structure

```
newbuild/
├── index.html                      # Landing page
├── master.html                     # Game Master interface
├── teams/
│   └── blue/
│       ├── facilitator.html
│       ├── notetaker.html
│       └── whitecell.html
│
├── src/
│   ├── core/
│   │   ├── config.js               # Configuration & constants
│   │   ├── enums.js                # All enumerations
│   │   ├── types.js                # JSDoc type definitions
│   │   └── errors.js               # Custom error classes
│   │
│   ├── services/
│   │   ├── supabase.js             # Supabase client initialization
│   │   ├── database.js             # Database operations (CRUD)
│   │   ├── realtime.js             # Real-time subscriptions
│   │   ├── storage.js              # localStorage/IndexedDB wrapper
│   │   └── sync.js                 # Offline sync queue
│   │
│   ├── stores/
│   │   ├── session.js              # Session state store
│   │   ├── gameState.js            # Move/phase/timer store
│   │   ├── actions.js              # Actions store
│   │   ├── requests.js             # RFIs store
│   │   ├── timeline.js             # Timeline store
│   │   └── participants.js         # Participants store
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   ├── roles.js
│   │   │   └── heartbeat.js
│   │   │
│   │   ├── actions/
│   │   │   ├── actionForm.js
│   │   │   ├── actionList.js
│   │   │   ├── actionSubmit.js
│   │   │   └── adjudication.js
│   │   │
│   │   ├── requests/
│   │   │   ├── rfiForm.js
│   │   │   ├── rfiList.js
│   │   │   └── rfiResponse.js
│   │   │
│   │   ├── timeline/
│   │   │   ├── capture.js
│   │   │   ├── timelineView.js
│   │   │   └── filters.js
│   │   │
│   │   ├── dynamics/
│   │   │   ├── leadershipForm.js
│   │   │   ├── frictionMetrics.js
│   │   │   └── allianceTracking.js
│   │   │
│   │   ├── gameControl/
│   │   │   ├── movePhase.js
│   │   │   ├── timer.js
│   │   │   └── stateSync.js
│   │   │
│   │   └── export/
│   │       ├── exportJson.js
│   │       ├── exportCsv.js
│   │       ├── exportXlsx.js
│   │       ├── exportPdf.js
│   │       └── exportZip.js
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.js
│   │   │   ├── Modal.js
│   │   │   ├── Toast.js
│   │   │   ├── Loader.js
│   │   │   ├── Badge.js
│   │   │   └── Card.js
│   │   │
│   │   ├── forms/
│   │   │   ├── Select.js
│   │   │   ├── Textarea.js
│   │   │   ├── Slider.js
│   │   │   └── Checkbox.js
│   │   │
│   │   └── layout/
│   │       ├── Header.js
│   │       ├── Sidebar.js
│   │       └── Section.js
│   │
│   ├── utils/
│   │   ├── validation.js           # Form validation
│   │   ├── formatting.js           # Date, time, text formatting
│   │   ├── keyGenerator.js         # Consistent storage key generation
│   │   ├── debounce.js             # Debounce/throttle utilities
│   │   └── logger.js               # Debug logging
│   │
│   ├── roles/
│   │   ├── facilitator.js          # Facilitator page controller
│   │   ├── notetaker.js            # Notetaker page controller
│   │   ├── whitecell.js            # White Cell page controller
│   │   └── gamemaster.js           # Game Master page controller
│   │
│   └── main.js                     # Application entry point
│
├── styles/
│   ├── base/
│   │   ├── reset.css
│   │   ├── variables.css           # CSS custom properties
│   │   └── typography.css
│   │
│   ├── components/
│   │   ├── buttons.css
│   │   ├── forms.css
│   │   ├── cards.css
│   │   └── modals.css
│   │
│   ├── layouts/
│   │   ├── header.css
│   │   ├── sidebar.css
│   │   └── grid.css
│   │
│   └── pages/
│       ├── facilitator.css
│       ├── notetaker.css
│       ├── whitecell.css
│       └── gamemaster.css
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   │
│   ├── integration/
│   │   ├── actions.test.js
│   │   ├── requests.test.js
│   │   └── sync.test.js
│   │
│   └── e2e/
│       ├── facilitator.spec.js
│       ├── whitecell.spec.js
│       └── fullFlow.spec.js
│
├── docs/
│   ├── API.md
│   ├── DATA_FLOW.md
│   └── DEPLOYMENT.md
│
├── package.json
├── vite.config.js
└── .env.example
```

---

## 5. Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sessions` | Session metadata | id, name, status, metadata |
| `game_state` | Move, phase, timer | session_id, move, phase, timer_seconds |
| `participants` | User information | client_id, name, role |
| `session_participants` | Active connections | session_id, participant_id, is_active, heartbeat_at |
| `actions` | Strategic actions | mechanism, sector, targets, status, adjudication |
| `action_logs` | Action audit trail | action_id, status_from, status_to |
| `requests` | RFIs | priority, categories, query, status |
| `communications` | RFI responses | type, from_role, to_role, content |
| `timeline` | Timeline events | team, type, content, metadata |
| `notetaker_data` | Dynamics analysis | dynamics_analysis, external_factors |
| `game_state_transitions` | Move/phase history | transition_type, from_value, to_value |
| `participant_activity` | Activity tracking | event_type, metadata |

### Key Relationships

```
sessions
    ├── game_state (1:1)
    ├── session_participants (1:N)
    ├── actions (1:N)
    │   └── action_logs (1:N)
    ├── requests (1:N)
    │   └── communications (1:N via linked_request_id)
    ├── timeline (1:N)
    ├── notetaker_data (1:N per move)
    └── game_state_transitions (1:N)
```

### Complete SQL Schema

The complete schema is available at `/data/COMPLETE_SCHEMA.sql`. Key highlights:

1. **UUID primary keys** for all tables
2. **Foreign key constraints** with CASCADE deletes
3. **Row Level Security (RLS)** enabled on all tables
4. **Indexes** for performance on frequently queried columns
5. **Triggers** for auto-updating timestamps
6. **Real-time enabled** for all tables

---

## 6. Core Modules

### 6.1 Configuration Module (`config.js`)

```javascript
// src/core/config.js
export const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',

    // Role limits
    ROLE_LIMITS: {
        'blue_facilitator': 1,
        'blue_whitecell': 1,
        'blue_notetaker': 2,
        'white': 1,
        'viewer': 999
    },

    // Heartbeat settings
    HEARTBEAT_INTERVAL_MS: 30000,
    HEARTBEAT_TIMEOUT_SECONDS: 120,

    // Timer defaults
    DEFAULT_TIMER_SECONDS: 5400, // 90 minutes

    // Auto-save interval
    AUTOSAVE_INTERVAL_MS: 30000,

    // Storage key prefix
    STORAGE_PREFIX: 'esg'
};
```

### 6.2 Enums Module (`enums.js`)

```javascript
// src/core/enums.js
export const ENUMS = {
    MECHANISMS: [
        'sanctions',
        'export',
        'investment',
        'trade',
        'financial',
        'economic',
        'industrial',
        'infrastructure'
    ],

    SECTORS: [
        'biotechnology',
        'agriculture',
        'telecommunications',
        'semiconductors',
        'energy',
        'finance'
    ],

    EXPOSURE_TYPES: [
        'Supply Chain',
        'Cyber',
        'Financial',
        'Industrial',
        'Trade'
    ],

    TARGETS: [
        'PRC', 'RUS', 'EU-GER', 'EU-FRA', 'EU-NLD',
        'JPN', 'KOR', 'TWN', 'AUS', 'GBR', 'CAN', 'IND'
    ],

    PRIORITY: ['NORMAL', 'HIGH', 'URGENT'],

    OBSERVATION_TYPES: ['NOTE', 'MOMENT', 'QUOTE'],

    ACTION_STATUS: ['draft', 'submitted', 'adjudicated', 'abandoned'],

    REQUEST_STATUS: ['pending', 'answered', 'withdrawn'],

    OUTCOMES: ['SUCCESS', 'PARTIAL_SUCCESS', 'FAIL', 'BACKFIRE'],

    PHASES: {
        1: 'Internal Deliberation',
        2: 'Alliance Consultation',
        3: 'Finalization',
        4: 'Adjudication',
        5: 'Results Brief'
    },

    MOVES: {
        1: 'Epoch 1 (2027-2030)',
        2: 'Epoch 2 (2030-2032)',
        3: 'Epoch 3 (2032-2034)'
    }
};
```

### 6.3 Storage Key Generator (`keyGenerator.js`)

**CRITICAL: This fixes the storage key inconsistency problem**

```javascript
// src/utils/keyGenerator.js
import { CONFIG } from '../core/config.js';

/**
 * Generate consistent storage keys across all roles
 * @param {string} dataType - Type of data (actions, requests, etc.)
 * @param {string} sessionId - Session ID
 * @param {number} move - Move number
 * @returns {string} Storage key
 */
export function getStorageKey(dataType, sessionId, move) {
    if (!sessionId) {
        console.warn('[KeyGenerator] No session ID provided, using legacy key');
        return `${CONFIG.STORAGE_PREFIX}_${dataType}_move_${move}`;
    }
    return `${CONFIG.STORAGE_PREFIX}_${dataType}_session_${sessionId}_move_${move}`;
}

/**
 * Get all possible keys for a data type (for migration/fallback)
 * @param {string} dataType - Type of data
 * @param {string} sessionId - Session ID
 * @param {number} move - Move number
 * @returns {string[]} Array of possible keys, prioritized
 */
export function getPossibleKeys(dataType, sessionId, move) {
    const keys = [];

    // Session-based key (preferred)
    if (sessionId) {
        keys.push(`${CONFIG.STORAGE_PREFIX}_${dataType}_session_${sessionId}_move_${move}`);
    }

    // Legacy patterns
    keys.push(`${CONFIG.STORAGE_PREFIX}_${dataType}_move_${move}`);
    keys.push(`blue${capitalize(dataType)}_move_${move}`);
    keys.push(`${dataType}_move_${move}`);

    return keys;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### 6.4 Session Store (`session.js`)

**CRITICAL: Centralized session management**

```javascript
// src/stores/session.js

let currentSessionId = null;
let currentClientId = null;
let currentRole = null;

const listeners = new Set();

export const sessionStore = {
    /**
     * Initialize session from storage
     */
    init() {
        currentSessionId = sessionStorage.getItem('esg_session_id');
        currentClientId = sessionStorage.getItem('esg_client_id') || this.generateClientId();
        currentRole = sessionStorage.getItem('esg_role');

        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'esg_session_id') {
                currentSessionId = e.newValue;
                this.notify();
            }
        });

        console.log('[SessionStore] Initialized:', {
            sessionId: currentSessionId,
            clientId: currentClientId?.substring(0, 8),
            role: currentRole
        });
    },

    /**
     * Get current session ID (always fresh)
     */
    getSessionId() {
        // Always check storage in case another tab updated it
        const storedId = sessionStorage.getItem('esg_session_id');
        if (storedId !== currentSessionId) {
            currentSessionId = storedId;
        }
        return currentSessionId;
    },

    /**
     * Set session ID
     */
    setSessionId(sessionId) {
        currentSessionId = sessionId;
        sessionStorage.setItem('esg_session_id', sessionId);
        this.notify();
    },

    /**
     * Get client ID
     */
    getClientId() {
        return currentClientId;
    },

    /**
     * Get current role
     */
    getRole() {
        return currentRole;
    },

    /**
     * Set role
     */
    setRole(role) {
        currentRole = role;
        sessionStorage.setItem('esg_role', role);
        this.notify();
    },

    /**
     * Generate unique client ID
     */
    generateClientId() {
        const id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('esg_client_id', id);
        return id;
    },

    /**
     * Validate session is properly configured
     */
    validate() {
        const issues = [];

        if (!this.getSessionId()) {
            issues.push('No session ID - user must join a session');
        }
        if (!currentClientId) {
            issues.push('No client ID - session store not initialized');
        }
        if (!currentRole) {
            issues.push('No role set - user must log in');
        }

        return {
            valid: issues.length === 0,
            sessionId: this.getSessionId(),
            clientId: currentClientId,
            role: currentRole,
            issues
        };
    },

    /**
     * Subscribe to session changes
     */
    subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    /**
     * Notify listeners of changes
     */
    notify() {
        listeners.forEach(cb => cb(this.validate()));
    },

    /**
     * Clear session (logout)
     */
    clear() {
        currentSessionId = null;
        currentRole = null;
        sessionStorage.removeItem('esg_session_id');
        sessionStorage.removeItem('esg_role');
        this.notify();
    }
};
```

---

## 7. Role-Based Features

### 7.1 Facilitator Features

| Feature | Description | Data Flow |
|---------|-------------|-----------|
| **Create Action** | Submit strategic economic actions | Form → Validation → Database → Real-time broadcast |
| **Submit Action** | Send action to White Cell | Update status → Notify White Cell |
| **Edit/Delete Draft** | Modify actions before submission | Update/Delete → Save to database |
| **Create RFI** | Request information from White Cell | Form → Database → Notify White Cell |
| **Withdraw RFI** | Cancel pending RFI | Update status → Notify White Cell |
| **View Responses** | See White Cell responses | Subscribe to communications |
| **Quick Capture** | Record observations | Save to timeline |
| **View Timeline** | See session history | Subscribe to timeline |

### 7.2 Notetaker Features

| Feature | Description | Data Flow |
|---------|-------------|-----------|
| **Quick Capture** | NOTE, MOMENT, QUOTE | Form → Timeline table → Broadcast |
| **Team Dynamics** | Leadership, friction metrics | Form → notetaker_data → Auto-save |
| **Alliance Tracking** | External factors | Form → notetaker_data → Auto-save |
| **View Actions** | See submitted actions (read-only) | Subscribe to actions |
| **View Timeline** | Chronological event log | Subscribe to timeline |
| **Export Notes** | Download captured data | Gather data → Format → Download |

### 7.3 White Cell Features

| Feature | Description | Data Flow |
|---------|-------------|-----------|
| **Move Control** | Advance moves 1→2→3 | Update game_state → Broadcast |
| **Phase Control** | Advance phases 1→5 | Update game_state → Broadcast |
| **Timer Control** | Start/Pause/Reset | Update game_state → Broadcast |
| **View Actions** | See submitted actions | Subscribe to actions |
| **Adjudicate** | Evaluate action outcomes | Update action.adjudication → Notify Facilitator |
| **Respond to RFIs** | Answer information requests | Create communication → Update request status |
| **Quick Capture** | Record observations | Save to timeline |
| **Send Communications** | Message teams | Create communication → Broadcast |

### 7.4 Game Master Features

| Feature | Description | Data Flow |
|---------|-------------|-----------|
| **Create Session** | Initialize new simulation | Create session → Create game_state |
| **Delete Session** | Remove session and data | Delete cascade |
| **View Dashboard** | Real-time metrics | Subscribe to all tables |
| **Export Data** | Download in multiple formats | Gather all data → Format → Download |
| **Manage Participants** | View/disconnect users | Query session_participants |
| **Control Game State** | Backup move/phase control | Update game_state |

---

## 8. Data Flow Architecture

### 8.1 Action Submission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FACILITATOR                                                      │
│ 1. Fill action form                                              │
│ 2. Click "Add Action"                                            │
│ 3. Validation (mechanism, sector, targets, goal, outcomes)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ DATA LAYER                                                       │
│ 1. Get session ID from sessionStore                              │
│ 2. Build action object with client_id, move, phase               │
│ 3. Set status = 'draft'                                          │
│ 4. INSERT into actions table                                     │
│ 5. Save to localStorage (backup)                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE REALTIME                                                │
│ 1. Broadcast INSERT event                                        │
│ 2. All subscribed clients receive update                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ WHITE CELL              │   │ NOTETAKER               │
│ Sees new action in list │   │ Sees action in timeline │
└─────────────────────────┘   └─────────────────────────┘
```

### 8.2 RFI Flow

```
FACILITATOR           WHITE CELL           DATABASE
    │                     │                    │
    │ Create RFI          │                    │
    │────────────────────────────────────────▶│
    │                     │   INSERT requests  │
    │                     │◀───────────────────│
    │                     │   Realtime event   │
    │                     │                    │
    │                     │ View pending RFI   │
    │                     │                    │
    │                     │ Send response      │
    │                     │────────────────────▶
    │                     │                    │ INSERT communications
    │                     │                    │ UPDATE requests.status
    │                     │                    │ Trigger: response_time
    │◀────────────────────────────────────────│
    │   Realtime event    │                    │
    │                     │                    │
    │ View response       │                    │
```

### 8.3 Game State Flow

```
WHITE CELL                  DATABASE                 ALL CLIENTS
    │                           │                         │
    │ Advance Phase             │                         │
    │──────────────────────────▶│                         │
    │                           │ UPDATE game_state       │
    │                           │──────────────────────▶  │
    │                           │   Realtime broadcast    │
    │                           │                         │
    │                           │                   ┌─────┴─────┐
    │                           │                   ▼           ▼
    │                           │            FACILITATOR   NOTETAKER
    │                           │            Update UI     Update UI
    │                           │            Load data     Load data
```

---

## 9. State Management

### 9.1 Game State Store

```javascript
// src/stores/gameState.js

const state = {
    move: 1,
    phase: 1,
    timerSeconds: 5400,
    timerRunning: false,
    timerLastUpdate: null
};

const listeners = new Set();

export const gameStateStore = {
    getState() {
        return { ...state };
    },

    getMove() {
        return state.move;
    },

    getPhase() {
        return state.phase;
    },

    async setMove(move) {
        if (move < 1 || move > 3) {
            throw new Error('Move must be between 1 and 3');
        }

        const previous = state.move;
        state.move = move;

        // Persist to database
        await database.updateGameState({ move });

        // Log transition
        await database.logTransition('move', previous, move);

        this.notify();
    },

    async setPhase(phase) {
        if (phase < 1 || phase > 5) {
            throw new Error('Phase must be between 1 and 5');
        }

        const previous = state.phase;
        state.phase = phase;

        // Persist to database
        await database.updateGameState({ phase });

        // Log transition
        await database.logTransition('phase', previous, phase);

        this.notify();
    },

    startTimer() {
        state.timerRunning = true;
        state.timerLastUpdate = Date.now();
        this.persistTimer();
        this.notify();
    },

    pauseTimer() {
        // Calculate elapsed and update seconds
        if (state.timerLastUpdate) {
            const elapsed = Math.floor((Date.now() - state.timerLastUpdate) / 1000);
            state.timerSeconds = Math.max(0, state.timerSeconds - elapsed);
        }
        state.timerRunning = false;
        state.timerLastUpdate = null;
        this.persistTimer();
        this.notify();
    },

    resetTimer(seconds = 5400) {
        state.timerSeconds = seconds;
        state.timerRunning = false;
        state.timerLastUpdate = null;
        this.persistTimer();
        this.notify();
    },

    getCurrentTimerSeconds() {
        if (!state.timerRunning || !state.timerLastUpdate) {
            return state.timerSeconds;
        }
        const elapsed = Math.floor((Date.now() - state.timerLastUpdate) / 1000);
        return Math.max(0, state.timerSeconds - elapsed);
    },

    persistTimer() {
        localStorage.setItem('esg_timer', JSON.stringify({
            seconds: state.timerSeconds,
            running: state.timerRunning,
            lastUpdate: state.timerLastUpdate
        }));
    },

    loadTimer() {
        const saved = localStorage.getItem('esg_timer');
        if (saved) {
            const { seconds, running, lastUpdate } = JSON.parse(saved);
            state.timerSeconds = seconds;
            state.timerRunning = running;
            state.timerLastUpdate = lastUpdate;
        }
    },

    subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    notify() {
        listeners.forEach(cb => cb(this.getState()));
    },

    // Handle realtime updates from other clients
    handleRealtimeUpdate(payload) {
        if (payload.new) {
            state.move = payload.new.move;
            state.phase = payload.new.phase;
            state.timerSeconds = payload.new.timer_seconds;
            state.timerRunning = payload.new.timer_running;
            state.timerLastUpdate = payload.new.timer_last_update;
            this.notify();
        }
    }
};
```

### 9.2 Actions Store

```javascript
// src/stores/actions.js

let actions = [];
const listeners = new Set();

export const actionsStore = {
    getAll() {
        return [...actions];
    },

    getByMove(move) {
        return actions.filter(a => a.move === move && !a.is_deleted);
    },

    getByStatus(status) {
        return actions.filter(a => a.status === status && !a.is_deleted);
    },

    getById(id) {
        return actions.find(a => a.id === id);
    },

    async create(actionData) {
        const sessionId = sessionStore.getSessionId();
        const clientId = sessionStore.getClientId();
        const { move, phase } = gameStateStore.getState();

        const action = {
            ...actionData,
            session_id: sessionId,
            client_id: clientId,
            move,
            phase,
            status: 'draft',
            created_at: new Date().toISOString()
        };

        const result = await database.createAction(action);
        actions.push(result);
        this.notify();
        return result;
    },

    async update(id, updates) {
        const result = await database.updateAction(id, updates);
        const index = actions.findIndex(a => a.id === id);
        if (index !== -1) {
            actions[index] = { ...actions[index], ...result };
        }
        this.notify();
        return result;
    },

    async submit(id) {
        return this.update(id, {
            status: 'submitted',
            submitted_at: new Date().toISOString()
        });
    },

    async delete(id) {
        await database.deleteAction(id);
        actions = actions.filter(a => a.id !== id);
        this.notify();
    },

    async load() {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            console.warn('[ActionsStore] No session ID, cannot load');
            return;
        }
        actions = await database.fetchActions(sessionId);
        this.notify();
    },

    subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },

    notify() {
        listeners.forEach(cb => cb(this.getAll()));
    },

    handleRealtimeUpdate(payload) {
        if (payload.eventType === 'INSERT') {
            if (!actions.find(a => a.id === payload.new.id)) {
                actions.push(payload.new);
                this.notify();
            }
        } else if (payload.eventType === 'UPDATE') {
            const index = actions.findIndex(a => a.id === payload.new.id);
            if (index !== -1) {
                actions[index] = payload.new;
                this.notify();
            }
        } else if (payload.eventType === 'DELETE') {
            actions = actions.filter(a => a.id !== payload.old.id);
            this.notify();
        }
    }
};
```

---

## 10. Real-Time Synchronization

### 10.1 Subscription Manager

```javascript
// src/services/realtime.js

import { supabase } from './supabase.js';

const subscriptions = new Map();

export const realtimeService = {
    /**
     * Subscribe to a table for a session
     */
    subscribe(table, sessionId, callback) {
        const channelName = `${table}_${sessionId}`;

        if (subscriptions.has(channelName)) {
            console.log(`[Realtime] Already subscribed to ${channelName}`);
            return;
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: `session_id=eq.${sessionId}`
                },
                (payload) => {
                    console.log(`[Realtime] ${table} update:`, payload.eventType);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] ${channelName} status:`, status);
            });

        subscriptions.set(channelName, channel);
        return channelName;
    },

    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channelName) {
        const channel = subscriptions.get(channelName);
        if (channel) {
            supabase.removeChannel(channel);
            subscriptions.delete(channelName);
        }
    },

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll() {
        subscriptions.forEach((channel, name) => {
            supabase.removeChannel(channel);
        });
        subscriptions.clear();
    },

    /**
     * Initialize all subscriptions for a session
     */
    initializeForSession(sessionId) {
        const tables = [
            'game_state',
            'actions',
            'requests',
            'communications',
            'timeline'
        ];

        tables.forEach(table => {
            this.subscribe(table, sessionId, (payload) => {
                // Route to appropriate store
                switch (table) {
                    case 'game_state':
                        gameStateStore.handleRealtimeUpdate(payload);
                        break;
                    case 'actions':
                        actionsStore.handleRealtimeUpdate(payload);
                        break;
                    case 'requests':
                        requestsStore.handleRealtimeUpdate(payload);
                        break;
                    case 'communications':
                        communicationsStore.handleRealtimeUpdate(payload);
                        break;
                    case 'timeline':
                        timelineStore.handleRealtimeUpdate(payload);
                        break;
                }
            });
        });
    }
};
```

### 10.2 Offline Queue

```javascript
// src/services/sync.js

const QUEUE_KEY = 'esg_offline_queue';

export const syncService = {
    queue: [],

    init() {
        const saved = localStorage.getItem(QUEUE_KEY);
        if (saved) {
            this.queue = JSON.parse(saved);
        }

        // Process queue when online
        window.addEventListener('online', () => this.processQueue());
    },

    enqueue(operation) {
        this.queue.push({
            ...operation,
            timestamp: Date.now()
        });
        this.persist();
    },

    async processQueue() {
        if (this.queue.length === 0) return;

        console.log(`[Sync] Processing ${this.queue.length} queued operations`);

        const failed = [];

        for (const op of this.queue) {
            try {
                await this.executeOperation(op);
            } catch (error) {
                console.error('[Sync] Failed to process:', op, error);
                failed.push(op);
            }
        }

        this.queue = failed;
        this.persist();
    },

    async executeOperation(op) {
        switch (op.type) {
            case 'CREATE_ACTION':
                await database.createAction(op.data);
                break;
            case 'UPDATE_ACTION':
                await database.updateAction(op.id, op.data);
                break;
            case 'CREATE_REQUEST':
                await database.createRequest(op.data);
                break;
            // ... other operations
        }
    },

    persist() {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    }
};
```

---

## 11. Authentication & Authorization

### 11.1 Role Configuration

```javascript
// src/features/auth/roles.js

export const ROLES = {
    white: {
        password: 'admin2025',
        displayName: 'Game Master',
        permissions: ['all'],
        maxPerSession: 1
    },
    blue_facilitator: {
        password: 'facilitator2025',
        displayName: 'Blue Team Facilitator',
        permissions: ['actions', 'requests', 'observations', 'timeline'],
        maxPerSession: 1
    },
    blue_notetaker: {
        password: 'notetaker2025',
        displayName: 'Blue Team Notetaker',
        permissions: ['observations', 'dynamics', 'timeline', 'actions_read'],
        maxPerSession: 2
    },
    blue_whitecell: {
        password: 'whitecell2025',
        displayName: 'Blue Team White Cell',
        permissions: ['game_control', 'adjudication', 'communications', 'timeline'],
        maxPerSession: 1
    },
    viewer: {
        password: 'observer',
        displayName: 'Viewer',
        permissions: ['timeline_read'],
        maxPerSession: 999
    }
};
```

### 11.2 Login Flow

```javascript
// src/features/auth/login.js

export async function login(sessionId, role, password) {
    // Validate password
    if (ROLES[role]?.password !== password) {
        throw new Error('Invalid password');
    }

    // Check role availability
    const availability = await checkRoleAvailability(sessionId, role);

    if (!availability.available) {
        // Return info for takeover dialog
        return {
            success: false,
            reason: 'role_full',
            activeParticipants: availability.activeParticipants
        };
    }

    // Set session
    sessionStore.setSessionId(sessionId);
    sessionStore.setRole(role);

    // Register participant
    await registerParticipant(sessionId, sessionStore.getClientId(), role);

    // Start heartbeat
    startHeartbeat();

    return { success: true };
}

async function checkRoleAvailability(sessionId, role) {
    const maxAllowed = ROLES[role]?.maxPerSession || 1;

    // Query active participants with recent heartbeat
    const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('role', role)
        .eq('is_active', true)
        .gt('heartbeat_at', new Date(Date.now() - 120000).toISOString());

    if (error) {
        console.error('[Auth] Error checking availability:', error);
        return { available: true }; // Fail open
    }

    return {
        available: data.length < maxAllowed,
        currentCount: data.length,
        maxAllowed,
        activeParticipants: data
    };
}
```

### 11.3 Heartbeat System

```javascript
// src/features/auth/heartbeat.js

let heartbeatInterval = null;

export function startHeartbeat() {
    if (heartbeatInterval) return;

    heartbeatInterval = setInterval(async () => {
        const sessionId = sessionStore.getSessionId();
        const clientId = sessionStore.getClientId();

        if (sessionId && clientId) {
            await supabase
                .from('session_participants')
                .update({
                    heartbeat_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                })
                .eq('session_id', sessionId)
                .eq('participant_id', clientId);
        }
    }, 30000);
}

export function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Auto-disconnect on page close
window.addEventListener('beforeunload', async () => {
    const sessionId = sessionStore.getSessionId();
    const clientId = sessionStore.getClientId();

    if (sessionId && clientId) {
        // Use sendBeacon for reliable delivery
        navigator.sendBeacon('/api/disconnect', JSON.stringify({
            sessionId,
            clientId
        }));
    }

    stopHeartbeat();
});
```

---

## 12. UI Components

### 12.1 Toast Notification

```javascript
// src/components/ui/Toast.js

let toastContainer = null;

export function showToast(message, duration = 3000, type = 'info') {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        animation: slideIn 0.3s ease;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
```

### 12.2 Modal Dialog

```javascript
// src/components/ui/Modal.js

export function showModal({ title, content, buttons = [] }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modal.innerHTML = `
        <h2 style="margin: 0 0 16px; font-size: 1.25rem;">${title}</h2>
        <div class="modal-content">${content}</div>
        <div class="modal-buttons" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;"></div>
    `;

    const buttonContainer = modal.querySelector('.modal-buttons');

    buttons.forEach(({ label, onClick, primary }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            background: ${primary ? '#3b82f6' : '#e5e7eb'};
            color: ${primary ? 'white' : '#374151'};
        `;
        btn.onclick = () => {
            onClick?.();
            overlay.remove();
        };
        buttonContainer.appendChild(btn);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    return overlay;
}
```

---

## 13. Export & Reporting

### 13.1 Data Gathering

```javascript
// src/features/export/gather.js

export async function gatherAllData(sessionId) {
    const [
        session,
        gameState,
        actions,
        requests,
        communications,
        timeline,
        notetakerData,
        participants
    ] = await Promise.all([
        database.getSession(sessionId),
        database.getGameState(sessionId),
        database.fetchActions(sessionId),
        database.fetchRequests(sessionId),
        database.fetchCommunications(sessionId),
        database.fetchTimeline(sessionId),
        database.fetchNotetakerData(sessionId),
        database.fetchParticipants(sessionId)
    ]);

    return {
        metadata: {
            exported_at: new Date().toISOString(),
            session_id: sessionId,
            session_name: session?.name
        },
        session,
        gameState,
        actions,
        requests,
        communications,
        timeline,
        notetakerData,
        participants
    };
}
```

### 13.2 Export Functions

```javascript
// src/features/export/exportJson.js
export function exportToJson(data) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `esg_export_${Date.now()}.json`, 'application/json');
}

// src/features/export/exportCsv.js
export function exportToCsv(data) {
    const csvData = {
        actions: arrayToCsv(data.actions),
        requests: arrayToCsv(data.requests),
        timeline: arrayToCsv(data.timeline)
    };

    // Create ZIP with multiple CSVs
    const zip = new JSZip();
    Object.entries(csvData).forEach(([name, csv]) => {
        zip.file(`${name}.csv`, csv);
    });

    zip.generateAsync({ type: 'blob' }).then(blob => {
        downloadFile(blob, `esg_export_${Date.now()}.zip`);
    });
}

// src/features/export/exportXlsx.js
export function exportToXlsx(data) {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.actions), 'Actions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.requests), 'RFIs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.timeline), 'Timeline');

    XLSX.writeFile(wb, `esg_export_${Date.now()}.xlsx`);
}

// src/features/export/exportPdf.js
export function exportToPdf(data) {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('ESG Simulation Report', 20, 20);

    doc.setFontSize(12);
    doc.text(`Session: ${data.metadata.session_name}`, 20, 35);
    doc.text(`Exported: ${data.metadata.exported_at}`, 20, 45);

    // Add tables for each data type
    // ... (use jspdf-autotable for better tables)

    doc.save(`esg_report_${Date.now()}.pdf`);
}
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

```javascript
// tests/unit/stores/session.test.js
describe('sessionStore', () => {
    beforeEach(() => {
        sessionStorage.clear();
        sessionStore.init();
    });

    test('generates client ID on init', () => {
        expect(sessionStore.getClientId()).toBeTruthy();
        expect(sessionStore.getClientId()).toMatch(/^client_/);
    });

    test('setSessionId persists to sessionStorage', () => {
        sessionStore.setSessionId('test-123');
        expect(sessionStorage.getItem('esg_session_id')).toBe('test-123');
    });

    test('validate returns issues when no session', () => {
        const result = sessionStore.validate();
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('No session ID - user must join a session');
    });
});
```

### 14.2 Integration Tests

```javascript
// tests/integration/actions.test.js
describe('Actions Flow', () => {
    test('create action saves to database', async () => {
        const action = await actionsStore.create({
            mechanism: 'sanctions',
            sector: 'semiconductors',
            targets: ['PRC'],
            goal: 'Test goal',
            expected_outcomes: 'Test outcomes',
            ally_contingencies: 'Test contingencies'
        });

        expect(action.id).toBeTruthy();
        expect(action.status).toBe('draft');
    });

    test('submit action updates status', async () => {
        const action = await actionsStore.create({ ... });
        await actionsStore.submit(action.id);

        const updated = actionsStore.getById(action.id);
        expect(updated.status).toBe('submitted');
        expect(updated.submitted_at).toBeTruthy();
    });
});
```

### 14.3 E2E Tests (Playwright)

```javascript
// tests/e2e/fullFlow.spec.js
import { test, expect } from '@playwright/test';

test('complete simulation flow', async ({ browser }) => {
    // Create two browser contexts for different roles
    const gmContext = await browser.newContext();
    const facilitatorContext = await browser.newContext();

    const gmPage = await gmContext.newPage();
    const facPage = await facilitatorContext.newPage();

    // Game Master creates session
    await gmPage.goto('/master.html');
    await gmPage.fill('#sessionName', 'Test Session');
    await gmPage.click('#createSession');

    const sessionId = await gmPage.locator('#currentSessionId').textContent();

    // Facilitator joins session
    await facPage.goto('/teams/blue/facilitator.html');
    await facPage.fill('#sessionIdInput', sessionId);
    await facPage.fill('#passwordInput', 'facilitator2025');
    await facPage.click('#loginBtn');

    // Facilitator creates action
    await facPage.selectOption('#actionMechanism', 'sanctions');
    await facPage.selectOption('#actionSector', 'semiconductors');
    await facPage.click('[data-target="PRC"]');
    await facPage.fill('#actionGoal', 'Test goal for the action');
    await facPage.fill('#actionOutcomes', 'Expected test outcomes');
    await facPage.fill('#actionContingencies', 'Test ally contingencies');
    await facPage.click('#addActionBtn');

    // Verify action appears
    await expect(facPage.locator('.action-card')).toBeVisible();
});
```

---

## 15. Implementation Phases

### Phase 1: Foundation (Week 1-2)

1. **Project Setup**
   - Initialize Vite project
   - Configure build tools
   - Set up folder structure
   - Configure Supabase connection

2. **Core Modules**
   - Config and enums
   - Session store
   - Storage key generator
   - Database service

3. **Basic UI**
   - Landing page
   - Login flow
   - Basic layout components

### Phase 2: Data Layer (Week 3-4)

1. **Stores**
   - Game state store
   - Actions store
   - Requests store
   - Timeline store

2. **Real-time**
   - Subscription manager
   - Event routing
   - Offline queue

3. **Authentication**
   - Role validation
   - Heartbeat system
   - Participant tracking

### Phase 3: Role Interfaces (Week 5-7)

1. **Facilitator**
   - Action form
   - RFI form
   - Timeline view
   - Responses view

2. **White Cell**
   - Game controls
   - Action review
   - Adjudication form
   - RFI response

3. **Notetaker**
   - Quick capture
   - Dynamics form
   - Alliance tracking
   - Timeline view

4. **Game Master**
   - Dashboard
   - Session management
   - Participant list
   - Export functions

### Phase 4: Polish & Testing (Week 8-9)

1. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

2. **Performance**
   - Lazy loading
   - Optimized renders
   - Bundle optimization

3. **Documentation**
   - API documentation
   - User guide
   - Deployment guide

---

## 16. Known Issues to Avoid

### From Current Implementation

| Issue | Cause | Solution |
|-------|-------|----------|
| **Storage key mismatch** | Different roles use different key patterns | Centralized key generator |
| **Session ID desync** | `const` declaration at init | Use getter function |
| **Timer drift** | No elapsed time calculation | Store lastUpdate timestamp |
| **Lost real-time updates** | Subscription not re-established after reconnect | Subscription manager with reconnect |
| **Duplicate code** | Similar logic in each role file | Shared modules and stores |
| **No offline support** | Fails silently when Supabase unavailable | Offline queue with sync |
| **Missing error handling** | Operations fail without user feedback | Consistent error handling with toasts |
| **Role slot race condition** | Check and register not atomic | Use database transaction |

### Best Practices

1. **Always use `sessionStore.getSessionId()`** - Never cache session ID
2. **Use consistent storage keys** - Always go through `getStorageKey()`
3. **Handle offline gracefully** - Queue operations when offline
4. **Show loading states** - Provide feedback during async operations
5. **Log everything in debug mode** - But disable in production
6. **Validate before database operations** - Check session and role first
7. **Use real-time for sync** - Don't poll for updates
8. **Clean up on unmount** - Unsubscribe from all channels

---

## Appendix: Quick Reference

### Storage Keys

```javascript
// Session-based (preferred)
`esg_actions_session_${sessionId}_move_${move}`
`esg_requests_session_${sessionId}_move_${move}`
`esg_communications_session_${sessionId}_move_${move}`
`esg_timeline_session_${sessionId}_move_${move}`
`esg_notetaker_session_${sessionId}_move_${move}`
`esg_whitecell_session_${sessionId}_move_${move}`

// Shared (not session-specific)
`esg_timer`
```

### Session Storage Keys

```javascript
`esg_session_id`  // Current session ID
`esg_client_id`   // Unique client identifier
`esg_role`        // Current user role
```

### API Quick Reference

```javascript
// Session
sessionStore.getSessionId()
sessionStore.setSessionId(id)
sessionStore.getClientId()
sessionStore.getRole()
sessionStore.validate()

// Game State
gameStateStore.getMove()
gameStateStore.setMove(move)
gameStateStore.getPhase()
gameStateStore.setPhase(phase)
gameStateStore.startTimer()
gameStateStore.pauseTimer()
gameStateStore.resetTimer()

// Actions
actionsStore.create(data)
actionsStore.update(id, data)
actionsStore.submit(id)
actionsStore.delete(id)
actionsStore.getByMove(move)

// Requests
requestsStore.create(data)
requestsStore.withdraw(id)
requestsStore.getByStatus(status)

// Real-time
realtimeService.subscribe(table, sessionId, callback)
realtimeService.unsubscribeAll()
```

---

**End of Rebuild Specification**
