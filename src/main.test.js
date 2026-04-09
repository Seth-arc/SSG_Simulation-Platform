import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockSessionStore,
    mockSyncService,
    mockDatabase,
    mockNavigateToApp
} = vi.hoisted(() => ({
    mockSessionStore: {
        getSnapshot: vi.fn(() => ({
            sessionId: null,
            role: null,
            sessionData: null
        })),
        clear: vi.fn()
    },
    mockSyncService: {
        reset: vi.fn()
    },
    mockDatabase: {
        disconnectParticipant: vi.fn()
    },
    mockNavigateToApp: vi.fn()
}));

vi.mock('./stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

vi.mock('./stores/gameState.js', () => ({
    gameStateStore: {}
}));

vi.mock('./stores/participants.js', () => ({
    participantsStore: {
        leave: vi.fn()
    }
}));

vi.mock('./services/sync.js', () => ({
    syncService: mockSyncService
}));

vi.mock('./services/database.js', () => ({
    database: mockDatabase
}));

vi.mock('./services/supabase.js', () => ({
    getRuntimeConfigStatus: () => ({ ready: true }),
    renderMissingBackendNotice: vi.fn()
}));

vi.mock('./components/ui/Toast.js', () => ({
    showToast: vi.fn()
}));

vi.mock('./components/ui/Loader.js', () => ({
    hideLoader: vi.fn()
}));

vi.mock('./utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

vi.mock('./core/navigation.js', () => ({
    isLandingPage: vi.fn(() => false),
    navigateToApp: mockNavigateToApp
}));

describe('main reload reauthentication guard', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        global.document = {
            readyState: 'loading',
            addEventListener: vi.fn(),
            getElementById: vi.fn(() => null),
            querySelectorAll: vi.fn(() => [])
        };
    });

    afterEach(() => {
        vi.resetModules();
        delete global.document;
    });

    it('allows public participant roles to survive a browser reload', async () => {
        const { shouldRequireFreshParticipantLoginOnReload } = await import('./main.js');

        expect(shouldRequireFreshParticipantLoginOnReload({
            snapshot: {
                sessionId: 'session-1',
                role: 'viewer',
                sessionData: {
                    role: 'viewer',
                    roleSurface: 'viewer'
                }
            },
            navigationType: 'reload',
            landingPage: false
        })).toBe(false);
    });

    it('does not force operator roles back through login on reload', async () => {
        const { shouldRequireFreshParticipantLoginOnReload } = await import('./main.js');

        expect(shouldRequireFreshParticipantLoginOnReload({
            snapshot: {
                sessionId: 'session-1',
                role: 'whitecell_lead',
                sessionData: {
                    role: 'whitecell_lead',
                    roleSurface: 'whitecell'
                }
            },
            navigationType: 'reload',
            landingPage: false
        })).toBe(false);
    });

    it('does not clear or redirect an existing public participant session after reload', async () => {
        const { enforceReloadReauthentication } = await import('./main.js');
        const locationRef = {
            replace: vi.fn(),
            assign: vi.fn()
        };

        const enforced = await enforceReloadReauthentication({
            snapshot: {
                sessionId: 'session-1',
                role: 'blue_facilitator',
                sessionData: {
                    role: 'blue_facilitator',
                    roleSurface: 'facilitator',
                    participantSessionId: 'seat-1'
                }
            },
            locationRef,
            navigationType: 'reload',
            landingPage: false
        });

        expect(enforced).toBe(false);
        expect(mockDatabase.disconnectParticipant).not.toHaveBeenCalled();
        expect(mockSyncService.reset).not.toHaveBeenCalled();
        expect(mockSessionStore.clear).not.toHaveBeenCalled();
        expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
});
