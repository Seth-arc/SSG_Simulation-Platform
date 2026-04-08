import { TEAM_OPTIONS, buildTeamRole, ROLE_SURFACES } from './teamContext.js';

const TEAM_ROLE_LIMITS = Object.fromEntries(
    TEAM_OPTIONS.flatMap((team) => ([
        [buildTeamRole(team.id, ROLE_SURFACES.FACILITATOR), 1],
        [buildTeamRole(team.id, ROLE_SURFACES.WHITECELL), 1],
        [buildTeamRole(team.id, ROLE_SURFACES.NOTETAKER), 2]
    ]))
);

/**
 * Application Configuration
 * Central configuration for the ESG Simulation Platform
 */

export const CONFIG = {
    // Supabase connection (loaded from environment)
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    RUNTIME_MODE: 'backend-required',
    // Temporary client-side live-demo gate. Prompt 5 replaces this with server-backed auth.
    OPERATOR_ACCESS_CODE: import.meta.env.VITE_OPERATOR_ACCESS_CODE || 'admin2025',

    // Role limits per session
    ROLE_LIMITS: {
        'white': 1,
        ...TEAM_ROLE_LIMITS,
        'viewer': 999
    },

    // Heartbeat settings
    HEARTBEAT_INTERVAL_MS: 30000,       // 30 seconds
    HEARTBEAT_TIMEOUT_SECONDS: 120,      // 2 minutes - consider user disconnected after this

    // Timer defaults
    DEFAULT_TIMER_SECONDS: 5400,         // 90 minutes

    // Auto-save interval
    AUTOSAVE_INTERVAL_MS: 30000,         // 30 seconds

    // Storage key prefix
    STORAGE_PREFIX: 'esg',

    // Debounce delays
    DEBOUNCE_INPUT_MS: 300,
    DEBOUNCE_SAVE_MS: 1000,

    // Real-time reconnection
    REALTIME_RECONNECT_DELAY_MS: 1000,
    REALTIME_MAX_RECONNECT_ATTEMPTS: 5,

    // Toast notification durations
    TOAST_DURATION_MS: 3000,
    TOAST_ERROR_DURATION_MS: 5000,

    // Debug mode
    DEBUG: import.meta.env.VITE_DEBUG === 'true',

    // Version
    VERSION: '2.0.0'
};

export function isPlaceholderValue(value) {
    if (!value || typeof value !== 'string') return true;

    const normalized = value.trim().toLowerCase();
    return [
        'your-project',
        'project-ref',
        'your-anon-key',
        'placeholder',
        'changeme',
        '<required>',
        '<your-supabase-anon-key>'
    ].some((token) => normalized.includes(token));
}

export function isValidSupabaseUrl(url) {
    return Boolean(
        url &&
        typeof url === 'string' &&
        url.startsWith('https://') &&
        url.includes('.supabase.co') &&
        !isPlaceholderValue(url)
    );
}

/**
 * Validate that required configuration is present
 * @param {Object} [config] - Config override for tests
 * @returns {{ valid: boolean, issues: string[], runtimeMode: string }}
 */
export function validateConfig(config = CONFIG) {
    const supabaseUrl = config.SUPABASE_URL ?? config.VITE_SUPABASE_URL ?? '';
    const supabaseAnonKey = config.SUPABASE_ANON_KEY ?? config.VITE_SUPABASE_ANON_KEY ?? '';
    const issues = [];

    if (!supabaseUrl) {
        issues.push('VITE_SUPABASE_URL is not configured.');
    } else if (!isValidSupabaseUrl(supabaseUrl)) {
        issues.push('VITE_SUPABASE_URL must be a valid Supabase project URL.');
    }

    if (!supabaseAnonKey) {
        issues.push('VITE_SUPABASE_ANON_KEY is not configured.');
    } else if (isPlaceholderValue(supabaseAnonKey)) {
        issues.push('VITE_SUPABASE_ANON_KEY must be replaced with a real Supabase anon key.');
    }

    return {
        valid: issues.length === 0,
        issues,
        runtimeMode: config.RUNTIME_MODE || CONFIG.RUNTIME_MODE
    };
}

export function buildMissingConfigMessage(validation = validateConfig()) {
    const baseMessage = 'Backend configuration is required. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.';
    if (!validation?.issues?.length) {
        return baseMessage;
    }

    return `${baseMessage} ${validation.issues.join(' ')}`;
}

export default CONFIG;
