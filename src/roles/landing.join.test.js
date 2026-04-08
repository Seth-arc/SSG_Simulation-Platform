import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockDatabase,
    mockSessionStore,
    mockEnsureBrowserIdentity,
    mockShowToast,
    mockShowLoader,
    mockHideLoader
} = vi.hoisted(() => ({
    mockDatabase: {
        lookupJoinableSessionByCode: vi.fn(),
        claimParticipantSeat: vi.fn(),
        getGameState: vi.fn(),
        disconnectParticipant: vi.fn(),
        getActiveSessions: vi.fn(),
        getActiveParticipants: vi.fn()
    },
    mockSessionStore: {
        getClientId: vi.fn(() => 'client-landing-test'),
        clearOperatorAuth: vi.fn(),
        setSessionId: vi.fn(),
        setRole: vi.fn(),
        setUserName: vi.fn(),
        setSessionData: vi.fn(),
        setGameState: vi.fn()
    },
    mockEnsureBrowserIdentity: vi.fn(),
    mockShowToast: vi.fn(),
    mockShowLoader: vi.fn(() => ({ id: 'loader-1' })),
    mockHideLoader: vi.fn()
}));

vi.mock('../services/database.js', () => ({
    database: mockDatabase
}));

vi.mock('../stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

vi.mock('../services/supabase.js', () => ({
    getRuntimeConfigStatus: () => ({ ready: true }),
    ensureBrowserIdentity: mockEnsureBrowserIdentity
}));

vi.mock('../components/ui/Toast.js', () => ({
    showToast: mockShowToast
}));

vi.mock('../components/ui/Loader.js', () => ({
    showLoader: mockShowLoader,
    hideLoader: mockHideLoader
}));

vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

function createElement(value = '') {
    return {
        value,
        focus: vi.fn()
    };
}

async function loadLandingModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./landing.js');
}

describe('landing secure join flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionStore.getClientId.mockReturnValue('client-landing-test');
        mockEnsureBrowserIdentity.mockResolvedValue({
            access_token: 'anon-token'
        });
    });

    afterEach(() => {
        vi.resetModules();
        delete global.document;
        delete global.window;
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
    });

    it('joins successfully by a valid code without listing public session inventory', async () => {
        const elements = {
            sessionCode: createElement('alpha2026'),
            displayName: createElement('Morgan')
        };

        global.document = {
            getElementById(id) {
                return elements[id] || null;
            }
        };

        mockDatabase.lookupJoinableSessionByCode.mockResolvedValue({
            id: 'session-1',
            name: 'Alpha Session',
            session_code: 'ALPHA2026',
            status: 'active'
        });
        mockDatabase.claimParticipantSeat.mockResolvedValue({
            id: 'session-participant-1',
            claim_status: 'claimed'
        });
        mockDatabase.getGameState.mockResolvedValue({
            move: 1,
            phase: 1
        });

        const { LandingController } = await loadLandingModule();
        const controller = new LandingController();
        controller.selectedTeam = 'blue';
        controller.selectedRoleSurface = 'facilitator';
        controller.selectedRole = 'blue_facilitator';
        controller.redirectToRole = vi.fn();

        await controller.handleJoinSession({
            preventDefault() {}
        });

        expect(mockEnsureBrowserIdentity).toHaveBeenCalledWith({
            clientId: 'client-landing-test'
        });
        expect(mockDatabase.lookupJoinableSessionByCode).toHaveBeenCalledWith('ALPHA2026');
        expect(mockDatabase.getActiveSessions).not.toHaveBeenCalled();
        expect(mockDatabase.getActiveParticipants).not.toHaveBeenCalled();
        expect(mockDatabase.claimParticipantSeat).toHaveBeenCalledWith('session-1', 'blue_facilitator', 'Morgan');
        expect(mockSessionStore.setSessionId).toHaveBeenCalledWith('session-1');
        expect(mockSessionStore.setSessionData).toHaveBeenCalledWith(expect.objectContaining({
            id: 'session-1',
            name: 'Alpha Session',
            code: 'ALPHA2026',
            participantId: 'session-participant-1',
            participantSessionId: 'session-participant-1',
            role: 'blue_facilitator',
            displayName: 'Morgan',
            team: 'blue',
            roleSurface: 'facilitator',
            seatClaimStatus: 'claimed'
        }));
        expect(controller.redirectToRole).toHaveBeenCalledWith('blue_facilitator');
        expect(mockShowToast).toHaveBeenCalledWith({
            message: 'Joined session successfully!',
            type: 'success'
        });
        expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });

    it('fails cleanly when the server-side lookup rejects an invalid code', async () => {
        const elements = {
            sessionCode: createElement('missing-code'),
            displayName: createElement('Morgan')
        };

        global.document = {
            getElementById(id) {
                return elements[id] || null;
            }
        };

        mockDatabase.lookupJoinableSessionByCode.mockRejectedValue(
            new Error('Session not found. Please check the code and try again.')
        );

        const { LandingController } = await loadLandingModule();
        const controller = new LandingController();
        controller.selectedTeam = 'blue';
        controller.selectedRoleSurface = 'facilitator';
        controller.selectedRole = 'blue_facilitator';
        controller.redirectToRole = vi.fn();

        await controller.handleJoinSession({
            preventDefault() {}
        });

        expect(mockDatabase.lookupJoinableSessionByCode).toHaveBeenCalledWith('MISSING-CODE');
        expect(mockDatabase.claimParticipantSeat).not.toHaveBeenCalled();
        expect(mockDatabase.getActiveSessions).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith({
            message: 'Session not found. Please check the code and try again.',
            type: 'error'
        });
        expect(controller.redirectToRole).not.toHaveBeenCalled();
        expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });

    it('routes public code lookup through the server-side contract only', async () => {
        mockDatabase.lookupJoinableSessionByCode.mockResolvedValue({
            id: 'session-lookup',
            name: 'Lookup Session',
            session_code: 'LOOKUP2026',
            status: 'active'
        });

        const { LandingController } = await loadLandingModule();
        const controller = new LandingController();
        const session = await controller.findSessionByCode('LOOKUP2026');

        expect(session).toEqual({
            id: 'session-lookup',
            name: 'Lookup Session',
            session_code: 'LOOKUP2026',
            status: 'active'
        });
        expect(mockDatabase.lookupJoinableSessionByCode).toHaveBeenCalledWith('LOOKUP2026');
        expect(mockDatabase.getActiveSessions).not.toHaveBeenCalled();
    });
});
