/**
 * Session Store
 * Centralized session state management
 */

import { createLogger } from '../utils/logger.js';
import {
    OPERATOR_SURFACES,
    isOperatorSurface,
    normalizeWhiteCellOperatorRole
} from '../core/teamContext.js';

const logger = createLogger('SessionStore');

let currentSessionId = null;
let currentClientId = null;
let currentRole = null;
let currentUserName = null;
let currentSessionData = null;
let currentOperatorAuth = null;
let initialized = false;
let storageListenerBound = false;

const listeners = new Set();

function readSessionDataFromStorage() {
    const cachedData = localStorage.getItem('esg_session_data');
    if (!cachedData) {
        return null;
    }

    try {
        return JSON.parse(cachedData);
    } catch (error) {
        logger.warn('Failed to parse cached session data');
        return null;
    }
}

function persistSessionData() {
    if (currentSessionData) {
        localStorage.setItem('esg_session_data', JSON.stringify(currentSessionData));
        return;
    }

    localStorage.removeItem('esg_session_data');
}

function normalizeOperatorAuth(auth) {
    if (!auth || typeof auth !== 'object') {
        return null;
    }

    const rawSurfaces = Array.isArray(auth.surfaces)
        ? auth.surfaces
        : (auth.surface ? [auth.surface] : []);
    const surfaces = [...new Set(rawSurfaces.filter((surface) => isOperatorSurface(surface)))];

    if (!surfaces.length) {
        return null;
    }

    const normalizeString = (value, { uppercase = false } = {}) => {
        if (typeof value !== 'string') {
            return null;
        }

        const normalizedValue = value.trim();
        if (!normalizedValue) {
            return null;
        }

        return uppercase ? normalizedValue.toUpperCase() : normalizedValue;
    };

    return {
        surfaces,
        operatorName: normalizeString(auth.operatorName),
        sessionId: normalizeString(auth.sessionId),
        sessionCode: normalizeString(auth.sessionCode, { uppercase: true }),
        teamId: normalizeString(auth.teamId),
        role: normalizeWhiteCellOperatorRole(normalizeString(auth.role) || ''),
        grantedAt: normalizeString(auth.grantedAt) || new Date().toISOString()
    };
}

function readOperatorAuthFromStorage() {
    const cachedData = localStorage.getItem('esg_operator_auth');
    if (!cachedData) {
        return null;
    }

    try {
        return normalizeOperatorAuth(JSON.parse(cachedData));
    } catch (error) {
        logger.warn('Failed to parse cached operator auth');
        return null;
    }
}

function persistOperatorAuth() {
    if (currentOperatorAuth) {
        localStorage.setItem('esg_operator_auth', JSON.stringify(currentOperatorAuth));
        return;
    }

    localStorage.removeItem('esg_operator_auth');
}

function buildDefaultGameState() {
    return {
        move: 1,
        phase: 1,
        timer_seconds: 0,
        timer_running: false
    };
}

function buildDefaultSessionData(sessionId = currentSessionId) {
    if (!sessionId) {
        return null;
    }

    return {
        id: sessionId,
        name: null,
        code: null,
        participantId: null,
        participantSessionId: null,
        role: currentRole,
        displayName: currentUserName || null,
        gameState: buildDefaultGameState()
    };
}

function normalizeSessionRole(role) {
    if (!role || typeof role !== 'string') {
        return role ?? null;
    }

    return normalizeWhiteCellOperatorRole(role);
}

function normalizeSessionData(data, sessionId = currentSessionId) {
    if (!data || typeof data !== 'object') {
        return buildDefaultSessionData(sessionId);
    }

    const resolvedSessionId = data.id || sessionId;
    const participantSessionId = data.participantSessionId || data.participantId || null;

    return {
        ...buildDefaultSessionData(resolvedSessionId),
        ...data,
        id: resolvedSessionId,
        participantId: participantSessionId,
        participantSessionId,
        role: normalizeSessionRole(data.role || currentRole),
        displayName: data.displayName || currentUserName || null,
        gameState: {
            ...buildDefaultGameState(),
            ...(data.gameState || {})
        }
    };
}

function syncSessionIdFromStorage() {
    const storedId = localStorage.getItem('esg_session_id');
    if (storedId !== currentSessionId) {
        currentSessionId = storedId;
    }

    return currentSessionId;
}

function syncOperatorAuthFromStorage() {
    currentOperatorAuth = readOperatorAuthFromStorage();
    return currentOperatorAuth;
}

function getEffectiveSessionData() {
    const sessionId = syncSessionIdFromStorage();
    if (!sessionId) {
        return null;
    }

    if (!currentSessionData) {
        currentSessionData = readSessionDataFromStorage();
    }

    const baseData = buildDefaultSessionData(sessionId);
    if (!currentSessionData) {
        currentSessionData = baseData;
        persistSessionData();
        return currentSessionData;
    }

    currentSessionData = normalizeSessionData({
        ...baseData,
        ...currentSessionData,
        id: currentSessionData.id || sessionId,
        role: currentSessionData.role || currentRole,
        displayName: currentSessionData.displayName || currentUserName || null
    }, sessionId);

    return currentSessionData;
}

function buildSnapshot() {
    const sessionId = syncSessionIdFromStorage();
    const issues = [];

    if (!sessionId) {
        issues.push('No session ID - user must join a session');
    }

    if (!currentClientId) {
        issues.push('No client ID - session store not initialized');
    }

    if (!currentRole) {
        issues.push('No role set - user must log in');
    }

    const valid = issues.length === 0;

    return {
        valid,
        isAuthenticated: valid,
        sessionId,
        clientId: currentClientId,
        role: currentRole,
        userName: currentUserName,
        operatorAuth: syncOperatorAuthFromStorage(),
        issues,
        sessionData: sessionId ? getEffectiveSessionData() : null
    };
}

function notifyListeners() {
    const snapshot = buildSnapshot();
    listeners.forEach((callback) => {
        try {
            callback(snapshot);
        } catch (error) {
            logger.error('Error in session subscriber:', error);
        }
    });
}

function bindStorageListener() {
    if (storageListenerBound || typeof window === 'undefined') {
        return;
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'esg_session_id' && event.newValue !== currentSessionId) {
            logger.info('Session ID changed in another tab');
            currentSessionId = event.newValue;
        }

        if (event.key === 'esg_role' && event.newValue !== currentRole) {
            logger.info('Role changed in another tab');
            currentRole = event.newValue;
        }

        if (event.key === 'esg_user_name' && event.newValue !== currentUserName) {
            currentUserName = event.newValue;
        }

        if (event.key === 'esg_session_data') {
            currentSessionData = readSessionDataFromStorage();
        }

        if (event.key === 'esg_operator_auth') {
            currentOperatorAuth = readOperatorAuthFromStorage();
        }

        notifyListeners();
    });

    storageListenerBound = true;
}

export const sessionStore = {
    init() {
        currentSessionId = localStorage.getItem('esg_session_id');
        currentClientId = localStorage.getItem('esg_client_id') || this.generateClientId();
        currentRole = normalizeSessionRole(localStorage.getItem('esg_role'));
        currentUserName = localStorage.getItem('esg_user_name');
        currentSessionData = normalizeSessionData(readSessionDataFromStorage(), currentSessionId);
        currentOperatorAuth = readOperatorAuthFromStorage();

        if (currentSessionData?.id && currentSessionId && currentSessionData.id !== currentSessionId) {
            currentSessionData = null;
            persistSessionData();
        }

        bindStorageListener();
        initialized = true;

        logger.info('Initialized:', {
            sessionId: currentSessionId ? `${currentSessionId.substring(0, 8)}...` : null,
            clientId: currentClientId ? `${currentClientId.substring(0, 12)}...` : null,
            role: currentRole
        });

        return buildSnapshot();
    },

    getSessionId() {
        return syncSessionIdFromStorage();
    },

    setSessionId(sessionId) {
        if (!sessionId) {
            logger.warn('Attempted to set empty session ID');
            return;
        }

        const hasChanged = currentSessionId !== sessionId;
        currentSessionId = sessionId;
        localStorage.setItem('esg_session_id', sessionId);

        if (hasChanged && currentSessionData?.id !== sessionId) {
            currentSessionData = buildDefaultSessionData(sessionId);
            persistSessionData();
        }

        logger.info('Session ID set:', `${sessionId.substring(0, 8)}...`);
        notifyListeners();
    },

    getClientId() {
        if (!currentClientId) {
            currentClientId = this.generateClientId();
        }
        return currentClientId;
    },

    getRole() {
        return currentRole;
    },

    setRole(role) {
        currentRole = normalizeSessionRole(role);
        localStorage.setItem('esg_role', currentRole);

        if (currentSessionData) {
            currentSessionData = {
                ...currentSessionData,
                role: currentRole
            };
            persistSessionData();
        }

        logger.info('Role set:', currentRole);
        notifyListeners();
    },

    getUserName() {
        return currentUserName;
    },

    setUserName(name) {
        currentUserName = name;
        localStorage.setItem('esg_user_name', name);

        if (currentSessionData) {
            currentSessionData = {
                ...currentSessionData,
                displayName: currentSessionData.displayName || name
            };
            persistSessionData();
        }

        notifyListeners();
    },

    generateClientId() {
        const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('esg_client_id', id);
        logger.debug('Generated client ID:', `${id.substring(0, 12)}...`);
        return id;
    },

    validate() {
        return buildSnapshot();
    },

    isAuthenticated() {
        return buildSnapshot().valid;
    },

    hasRole(roles) {
        if (!currentRole) return false;
        return Array.isArray(roles) ? roles.includes(currentRole) : currentRole === roles;
    },

    getState() {
        return buildSnapshot();
    },

    getSnapshot() {
        return buildSnapshot();
    },

    getSessionData() {
        return getEffectiveSessionData();
    },

    getSessionParticipantId() {
        const sessionData = getEffectiveSessionData();
        return sessionData?.participantSessionId || sessionData?.participantId || null;
    },

    getOperatorAuth() {
        return syncOperatorAuthFromStorage();
    },

    setOperatorAuth(auth) {
        currentOperatorAuth = normalizeOperatorAuth(auth);
        persistOperatorAuth();
        notifyListeners();
        return currentOperatorAuth;
    },

    clearOperatorAuth() {
        currentOperatorAuth = null;
        persistOperatorAuth();
        notifyListeners();
    },

    hasOperatorAccess(surface, {
        sessionId = null,
        teamId = null,
        role = null
    } = {}) {
        if (!isOperatorSurface(surface)) {
            return false;
        }

        const auth = syncOperatorAuthFromStorage();
        if (!auth?.surfaces?.includes(surface)) {
            return false;
        }

        if (role && auth.role !== role) {
            return false;
        }

        if (surface === OPERATOR_SURFACES.WHITE_CELL) {
            if (!auth.sessionId || !auth.teamId || !auth.role) {
                return false;
            }

            if (sessionId && auth.sessionId !== sessionId) {
                return false;
            }

            if (teamId && auth.teamId !== teamId) {
                return false;
            }
        }

        return true;
    },

    setSessionData(data) {
        if (!data) {
            currentSessionData = buildDefaultSessionData();
            persistSessionData();
            notifyListeners();
            return;
        }

        const sessionId = data.id || currentSessionId;
        if (!sessionId) {
            logger.warn('Attempted to cache session data without a session ID');
            return;
        }

        currentSessionData = normalizeSessionData({
            ...data,
            id: sessionId,
            role: data.role || currentRole,
            displayName: data.displayName || currentUserName || null
        }, sessionId);

        persistSessionData();
        notifyListeners();
    },

    mergeSessionData(partialData = {}) {
        const currentData = getEffectiveSessionData() || buildDefaultSessionData();
        if (!currentData) {
            return null;
        }

        const nextData = {
            ...currentData,
            ...partialData,
            gameState: {
                ...buildDefaultGameState(),
                ...(currentData.gameState || {}),
                ...(partialData.gameState || {})
            }
        };

        this.setSessionData(nextData);
        return nextData;
    },

    setGameState(gameState = {}) {
        return this.mergeSessionData({
            gameState
        });
    },

    subscribe(callback) {
        listeners.add(callback);
        callback(buildSnapshot());

        return () => {
            listeners.delete(callback);
        };
    },

    notify() {
        notifyListeners();
    },

    clear() {
        logger.info('Clearing session');

        currentSessionId = null;
        currentRole = null;
        currentUserName = null;
        currentSessionData = null;
        currentOperatorAuth = null;

        localStorage.removeItem('esg_session_id');
        localStorage.removeItem('esg_role');
        localStorage.removeItem('esg_user_name');
        localStorage.removeItem('esg_session_data');
        localStorage.removeItem('esg_operator_auth');

        notifyListeners();
    },

    clearAll() {
        this.clear();
        currentClientId = null;
        localStorage.removeItem('esg_client_id');
        notifyListeners();
    },

    restoreFromUrl() {
        if (typeof window === 'undefined') {
            return false;
        }

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session');

        if (sessionId) {
            this.setSessionId(sessionId);
            const url = new URL(window.location.href);
            url.searchParams.delete('session');
            window.history.replaceState({}, '', url);
            return true;
        }

        return false;
    },

    getSessionUrl() {
        const sessionId = this.getSessionId();
        if (!sessionId || typeof window === 'undefined') return null;

        const url = new URL(window.location.href);
        url.searchParams.set('session', sessionId);
        return url.toString();
    }
};

if (typeof window !== 'undefined' && !initialized) {
    sessionStore.restoreFromUrl();
    sessionStore.init();
}

export default sessionStore;
