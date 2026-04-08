import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    channelHandlers,
    mockRealtimeService,
    mockGameStateStore,
    mockActionsStore,
    mockRequestsStore,
    mockTimelineStore,
    mockParticipantsStore,
    mockCommunicationsStore,
    mockSessionStore
} = vi.hoisted(() => {
    const handlers = new Map();

    return {
        channelHandlers: handlers,
        mockRealtimeService: {
            initialize: vi.fn(),
            on: vi.fn((channelType, handler) => {
                handlers.set(channelType, handler);
                return vi.fn();
            }),
            onAll: vi.fn((handler) => {
                handlers.set('all', handler);
                return vi.fn();
            }),
            getStatus: vi.fn(() => ({ connected: true })),
            reset: vi.fn()
        },
        mockGameStateStore: {
            initialize: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockActionsStore: {
            initialize: vi.fn(),
            loadActions: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockRequestsStore: {
            initialize: vi.fn(),
            loadRequests: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockTimelineStore: {
            initialize: vi.fn(),
            loadEvents: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockParticipantsStore: {
            initialize: vi.fn(),
            loadParticipants: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockCommunicationsStore: {
            initialize: vi.fn(),
            loadCommunications: vi.fn(),
            updateFromServer: vi.fn(),
            reset: vi.fn()
        },
        mockSessionStore: {
            getSessionParticipantId: vi.fn(() => 'seat-session-store'),
            getSessionData: vi.fn(() => ({ participantId: 'seat-legacy' }))
        }
    };
});

vi.mock('./realtime.js', () => ({
    CHANNELS: {
        GAME_STATE: 'game_state',
        ACTIONS: 'actions',
        REQUESTS: 'requests',
        TIMELINE: 'timeline',
        PARTICIPANTS: 'session_participants',
        COMMUNICATIONS: 'communications'
    },
    realtimeService: mockRealtimeService
}));

vi.mock('../stores/gameState.js', () => ({
    gameStateStore: mockGameStateStore
}));

vi.mock('../stores/actions.js', () => ({
    actionsStore: mockActionsStore
}));

vi.mock('../stores/requests.js', () => ({
    requestsStore: mockRequestsStore
}));

vi.mock('../stores/timeline.js', () => ({
    timelineStore: mockTimelineStore
}));

vi.mock('../stores/participants.js', () => ({
    participantsStore: mockParticipantsStore
}));

vi.mock('../stores/communications.js', () => ({
    communicationsStore: mockCommunicationsStore
}));

vi.mock('../stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

async function loadSyncModule() {
    vi.resetModules();
    return import('./sync.js');
}

describe('syncService live bootstrap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        channelHandlers.clear();
        global.window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };
    });

    afterEach(() => {
        vi.resetModules();
        delete global.window;
    });

    it('initializes all live stores once the session and participant seat are known', async () => {
        const { syncService } = await loadSyncModule();

        await syncService.initialize('session-live-1', {
            participantId: 'seat-explicit-1'
        });

        expect(mockGameStateStore.initialize).toHaveBeenCalledWith('session-live-1');
        expect(mockActionsStore.initialize).toHaveBeenCalledWith('session-live-1');
        expect(mockRequestsStore.initialize).toHaveBeenCalledWith('session-live-1');
        expect(mockTimelineStore.initialize).toHaveBeenCalledWith('session-live-1');
        expect(mockParticipantsStore.initialize).toHaveBeenCalledWith('session-live-1', 'seat-explicit-1');
        expect(mockCommunicationsStore.initialize).toHaveBeenCalledWith('session-live-1');
        expect(mockRealtimeService.initialize).toHaveBeenCalledWith('session-live-1');
    });

    it('forwards realtime payloads into the corresponding stores', async () => {
        const { syncService } = await loadSyncModule();

        await syncService.initialize('session-live-2');

        channelHandlers.get('game_state')('UPDATE', {
            new: { move: 2, phase: 3 }
        });
        channelHandlers.get('actions')('INSERT', {
            new: { id: 'action-1' }
        });
        channelHandlers.get('requests')('UPDATE', {
            new: { id: 'request-1' }
        });
        channelHandlers.get('timeline')('INSERT', {
            new: { id: 'timeline-1' }
        });
        channelHandlers.get('session_participants')('UPDATE', {
            new: { id: 'participant-1' }
        });
        channelHandlers.get('communications')('INSERT', {
            new: { id: 'communication-1' }
        });

        expect(mockGameStateStore.updateFromServer).toHaveBeenCalledWith({ move: 2, phase: 3 });
        expect(mockActionsStore.updateFromServer).toHaveBeenCalledWith('INSERT', { id: 'action-1' });
        expect(mockRequestsStore.updateFromServer).toHaveBeenCalledWith('UPDATE', { id: 'request-1' });
        expect(mockTimelineStore.updateFromServer).toHaveBeenCalledWith('INSERT', { id: 'timeline-1' });
        expect(mockParticipantsStore.updateFromServer).toHaveBeenCalledWith('UPDATE', { id: 'participant-1' });
        expect(mockCommunicationsStore.updateFromServer).toHaveBeenCalledWith('INSERT', { id: 'communication-1' });
    });
});
