/**
 * Supabase Client Service
 * Initializes and exports the Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import {
    CONFIG,
    buildMissingConfigMessage,
    isValidSupabaseUrl,
    validateConfig
} from '../core/config.js';
import { AuthError, ConfigurationError } from '../core/errors.js';
import { createLogger } from '../utils/logger.js';
import { createE2EMockSupabaseClient, isE2EMockEnabled } from './supabaseMock.js';

const logger = createLogger('Supabase');
const RUNTIME_NOTICE_ID = 'runtimeConfigNotice';
const RUNTIME_NOTICE_STYLE_ID = 'runtime-config-notice-style';
const SUPABASE_AUTH_STORAGE_KEY = 'esg-simulation-auth';

let validation = validateConfig();
let initializationError = null;
const e2eMockEnabled = isE2EMockEnabled();

function buildRuntimeStatus() {
    if (e2eMockEnabled) {
        return {
            ready: true,
            runtimeMode: 'e2e-mock',
            issues: [],
            message: 'E2E mock backend enabled.'
        };
    }

    const issues = [...(validation.issues || [])];
    if (initializationError) {
        issues.push('Supabase client initialization failed.');
    }

    return {
        ready: !issues.length,
        runtimeMode: CONFIG.RUNTIME_MODE,
        issues,
        message: buildMissingConfigMessage({
            ...validation,
            issues
        })
    };
}

function createConfigurationError() {
    const status = buildRuntimeStatus();
    return new ConfigurationError(status.message, status.issues, 'BACKEND_CONFIG_REQUIRED');
}

export function createUnavailableSupabaseClient() {
    const throwConfigError = () => {
        throw createConfigurationError();
    };

    const authProxy = new Proxy({}, {
        get() {
            return throwConfigError;
        }
    });

    return new Proxy({
        from: throwConfigError,
        channel: throwConfigError,
        rpc: throwConfigError,
        auth: authProxy
    }, {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            }

            return throwConfigError;
        }
    });
}

function ensureRuntimeNoticeStyles() {
    if (typeof document === 'undefined' || document.getElementById(RUNTIME_NOTICE_STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = RUNTIME_NOTICE_STYLE_ID;
    style.textContent = `
        .runtime-config-notice {
            position: fixed;
            inset: 0;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: rgba(15, 23, 42, 0.78);
            backdrop-filter: blur(6px);
        }
        .runtime-config-notice[hidden] {
            display: none !important;
        }
        .runtime-config-panel {
            max-width: 48rem;
            width: min(100%, 48rem);
            background: #ffffff;
            color: #0f172a;
            border-radius: 1rem;
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.3);
            padding: 1.5rem;
            border: 1px solid rgba(148, 163, 184, 0.35);
        }
        .runtime-config-eyebrow {
            margin: 0 0 0.5rem;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #9f1239;
        }
        .runtime-config-title {
            margin: 0 0 0.75rem;
            font-size: 1.5rem;
            line-height: 1.2;
        }
        .runtime-config-copy {
            margin: 0 0 1rem;
            color: #334155;
        }
        .runtime-config-list {
            margin: 0 0 1rem;
            padding-left: 1.25rem;
            color: #334155;
        }
        .runtime-config-note {
            margin: 0;
            font-size: 0.95rem;
            color: #475569;
        }
    `;
    document.head.appendChild(style);
}

function getRuntimeNoticeContainer() {
    if (typeof document === 'undefined') {
        return null;
    }

    return document.getElementById(RUNTIME_NOTICE_ID) || (() => {
        const container = document.createElement('div');
        container.id = RUNTIME_NOTICE_ID;
        document.body.prepend(container);
        return container;
    })();
}

export function getRuntimeConfigStatus() {
    return buildRuntimeStatus();
}

export function isSupabaseConfigured() {
    return buildRuntimeStatus().ready;
}

export function renderMissingBackendNotice() {
    const status = buildRuntimeStatus();
    if (status.ready || typeof document === 'undefined') {
        return;
    }

    ensureRuntimeNoticeStyles();

    const container = getRuntimeNoticeContainer();
    if (!container) return;

    container.hidden = false;
    container.className = 'runtime-config-notice';
    container.innerHTML = `
        <div class="runtime-config-panel" role="alertdialog" aria-modal="true" aria-labelledby="runtime-config-title">
            <p class="runtime-config-eyebrow">Configuration Required</p>
            <h1 class="runtime-config-title" id="runtime-config-title">Supabase backend configuration is missing</h1>
            <p class="runtime-config-copy">${status.message}</p>
            <ul class="runtime-config-list">
                ${status.issues.map((issue) => `<li>${issue}</li>`).join('')}
            </ul>
            <p class="runtime-config-note">Update the local environment from <code>.env.example</code>, restart the dev server, and reload this page.</p>
        </div>
    `;
    document.body.dataset.runtimeConfigBlocked = 'true';
}

let rawSupabaseClient = null;

if (e2eMockEnabled) {
    rawSupabaseClient = createE2EMockSupabaseClient();
    logger.info('Supabase E2E mock backend enabled');
} else if (validation.valid && isValidSupabaseUrl(CONFIG.SUPABASE_URL)) {
    try {
        rawSupabaseClient = createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                    storageKey: SUPABASE_AUTH_STORAGE_KEY
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                },
                global: {
                    headers: {
                        'x-client-info': `esg-platform/${CONFIG.VERSION}`
                    }
                }
            }
        );
        logger.info('Supabase client initialized');
    } catch (error) {
        initializationError = error;
        logger.error('Failed to create Supabase client:', error);
    }
} else {
    logger.error('Backend configuration validation failed:', validation.issues);
}

export const supabase = rawSupabaseClient || createUnavailableSupabaseClient();

/**
 * Establish a real Supabase identity before any public join or browser write path.
 * GitHub Pages cannot safely hold a privileged server secret, so anonymous auth is the
 * lowest-friction browser bootstrap we can use before calling authenticated RPCs.
 */
export async function ensureBrowserIdentity({ clientId = null } = {}) {
    if (!rawSupabaseClient) {
        throw createConfigurationError();
    }

    const { data: sessionData, error: sessionError } = await rawSupabaseClient.auth.getSession();
    if (sessionError) {
        logger.error('Failed to read browser auth session:', sessionError);
        throw new AuthError(
            'Unable to verify browser identity. Please reload and try again.',
            'BROWSER_IDENTITY_UNAVAILABLE'
        );
    }

    if (sessionData?.session?.access_token && sessionData.session.user?.id) {
        return sessionData.session;
    }

    const metadata = clientId ? { client_id: clientId } : {};
    const { data, error } = await rawSupabaseClient.auth.signInAnonymously({
        options: {
            data: metadata
        }
    });

    if (error || !data?.session?.access_token) {
        logger.error('Failed to establish anonymous browser identity:', error);
        throw new AuthError(
            'Unable to establish browser identity. Enable Supabase anonymous sign-ins and try again.',
            'BROWSER_IDENTITY_REQUIRED'
        );
    }

    logger.info('Established anonymous browser identity', {
        userId: data.user?.id ? `${data.user.id.substring(0, 8)}...` : null
    });

    return data.session;
}

export function checkConnection() {
    if (!rawSupabaseClient) {
        return Promise.resolve(false);
    }

    return rawSupabaseClient
        .from('sessions')
        .select('id')
        .limit(1)
        .then(({ error }) => {
            if (error) {
                logger.error('Connection check failed:', error.message);
                return false;
            }

            return true;
        })
        .catch((error) => {
            logger.error('Connection check error:', error);
            return false;
        });
}

export async function getConnectionInfo() {
    if (!rawSupabaseClient) {
        return {
            connected: false,
            latency: null,
            error: createConfigurationError().message
        };
    }

    const startTime = performance.now();

    try {
        const { error } = await rawSupabaseClient
            .from('sessions')
            .select('count')
            .limit(1);

        const latency = Math.round(performance.now() - startTime);

        if (error) {
            return {
                connected: false,
                latency: null,
                error: error.message
            };
        }

        return {
            connected: true,
            latency,
            error: null
        };
    } catch (error) {
        return {
            connected: false,
            latency: null,
            error: error.message
        };
    }
}

export function isOnline() {
    return navigator.onLine;
}

export function setupConnectionListeners(onOnline, onOffline) {
    const handleOnline = () => {
        logger.info('Connection restored');
        onOnline?.();
    };

    const handleOffline = () => {
        logger.warn('Connection lost');
        onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

logger.info('Supabase runtime status', {
    mode: buildRuntimeStatus().runtimeMode,
    configured: isSupabaseConfigured(),
    url: CONFIG.SUPABASE_URL ? CONFIG.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET'
});

export default supabase;
