import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockDatabase,
    mockSessionStore
} = vi.hoisted(() => ({
    mockDatabase: {
        getActiveParticipants: vi.fn(),
        updateHeartbeat: vi.fn(),
        disconnectParticipantKeepalive: vi.fn(),
        disconnectParticipant: vi.fn()
    },
    mockSessionStore: {
        getSessionParticipantId: vi.fn(() => 'seat-participant-1')
    }
}));

vi.mock('../services/database.js', () => ({
    database: mockDatabase
}));

vi.mock('./session.js', () => ({
    sessionStore: mockSessionStore
}));

vi.mock('../core/config.js', () => ({
    CONFIG: {
        HEARTBEAT_INTERVAL_MS: 5000,
        PRESENCE_CLEANUP_INTERVAL_MS: 60000,
        ROLE_LIMITS: {}
    },
    getRoleLimit: vi.fn(() => 1),
    isHeartbeatFresh: vi.fn(() => true)
}));

vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

async function loadParticipantsModule() {
    vi.resetModules();
    return import('./participants.js');
}

describe('ParticipantsStore resilience', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        global.window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };
    });

    afterEach(async () => {
        vi.useRealTimers();
        vi.resetModules();
        delete global.window;
    });

    it('starts heartbeats even when the participant roster snapshot fails to load', async () => {
        mockDatabase.getActiveParticipants.mockRejectedValue(
            new Error('function public.release_stale_session_role_seats(uuid, integer) is not unique')
        );
        mockDatabase.updateHeartbeat.mockResolvedValue({
            id: 'seat-participant-1',
            heartbeat_at: '2026-04-08T15:00:00.000Z',
            last_seen: '2026-04-08T15:00:00.000Z',
            is_active: true
        });

        const { participantsStore } = await loadParticipantsModule();

        await expect(
            participantsStore.initialize('session-1', 'seat-participant-1')
        ).resolves.toEqual([]);

        await Promise.resolve();
        await Promise.resolve();

        expect(mockDatabase.getActiveParticipants).toHaveBeenCalledWith('session-1');
        expect(mockDatabase.updateHeartbeat).toHaveBeenCalledWith('session-1', 'seat-participant-1');
        expect(participantsStore.initialized).toBe(true);
        expect(participantsStore.currentParticipantId).toBe('seat-participant-1');
        expect(global.window.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));

        participantsStore.reset();
    });
});
