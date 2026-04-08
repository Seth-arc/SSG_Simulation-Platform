import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockDatabase,
    mockSessionStore,
    mockSyncService,
    mockGameStateStore,
    mockActionsStore,
    mockRequestsStore,
    mockTimelineStore,
    mockParticipantsStore
} = vi.hoisted(() => ({
    mockDatabase: {
        requireOperatorGrant: vi.fn(() => Promise.resolve({
            surface: 'gamemaster',
            role: 'white'
        })),
        getActiveSessions: vi.fn(() => Promise.resolve([
            {
                id: 'session-gm-1',
                name: 'Alpha Session',
                status: 'active',
                metadata: { session_code: 'ALPHA2026' },
                created_at: '2026-04-07T10:00:00.000Z',
                updated_at: '2026-04-07T10:00:00.000Z'
            }
        ])),
        fetchSessionBundle: vi.fn((sessionId) => Promise.resolve({
            session: {
                id: sessionId,
                name: 'Alpha Session',
                status: 'active',
                metadata: { session_code: 'ALPHA2026' },
                created_at: '2026-04-07T10:00:00.000Z',
                updated_at: '2026-04-07T10:00:00.000Z'
            },
            gameState: { move: 1, phase: 1 },
            participants: [],
            actions: [],
            requests: [],
            timeline: []
        }))
    },
    mockSessionStore: {
        getRole: vi.fn(() => 'white'),
        getSessionData: vi.fn(() => ({ role: 'white' })),
        hasOperatorAccess: vi.fn(() => true),
        setOperatorAuth: vi.fn(),
        clearOperatorAuth: vi.fn()
    },
    mockSyncService: {
        initialize: vi.fn(() => Promise.resolve()),
        reset: vi.fn(() => Promise.resolve())
    },
    mockGameStateStore: {
        subscribe: vi.fn(() => vi.fn()),
        getState: vi.fn(() => ({ move: 2, phase: 3 }))
    },
    mockActionsStore: {
        subscribe: vi.fn(() => vi.fn()),
        getAll: vi.fn(() => [{ id: 'action-gm-1' }])
    },
    mockRequestsStore: {
        subscribe: vi.fn(() => vi.fn()),
        getAll: vi.fn(() => [{ id: 'request-gm-1', status: 'pending' }])
    },
    mockTimelineStore: {
        subscribe: vi.fn(() => vi.fn()),
        getAll: vi.fn(() => [{ id: 'timeline-gm-1', created_at: '2026-04-07T11:00:00.000Z', content: 'Live update' }])
    },
    mockParticipantsStore: {
        subscribe: vi.fn(() => vi.fn()),
        getAll: vi.fn(() => [{ id: 'participant-gm-1', display_name: 'Morgan', role: 'blue_facilitator' }])
    }
}));

vi.mock('../services/database.js', () => ({
    database: mockDatabase
}));

vi.mock('../stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

vi.mock('../services/sync.js', () => ({
    syncService: mockSyncService
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

vi.mock('../services/supabase.js', () => ({
    getRuntimeConfigStatus: () => ({ ready: true })
}));

vi.mock('../components/ui/Toast.js', () => ({
    showToast: vi.fn()
}));

vi.mock('../components/ui/Badge.js', () => ({
    createBadge: vi.fn(() => ({
        outerHTML: '<span class="badge"></span>'
    }))
}));

vi.mock('../components/ui/Loader.js', () => ({
    showLoader: vi.fn(() => ({})),
    hideLoader: vi.fn(),
    showInlineLoader: vi.fn(() => ({
        hide: vi.fn()
    }))
}));

vi.mock('../components/ui/Modal.js', () => ({
    showModal: vi.fn(),
    confirmModal: vi.fn(),
    closeModal: vi.fn()
}));

vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

function createElement() {
    const listeners = new Map();

    return {
        innerHTML: '',
        textContent: '',
        value: '',
        style: {},
        disabled: false,
        dataset: {},
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            toggle: vi.fn()
        },
        addEventListener: vi.fn((eventName, listener) => {
            listeners.set(eventName, listener);
        }),
        click() {
            listeners.get('click')?.({
                target: this,
                currentTarget: this,
                preventDefault: vi.fn()
            });
        },
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => [])
    };
}

async function loadGameMasterModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./gamemaster.js');
}

describe('GameMaster live session monitoring', () => {
    let elements;

    beforeEach(() => {
        vi.clearAllMocks();
        elements = Object.fromEntries([
            'createSessionBtn',
            'refreshDashboardBtn',
            'participantsSessionSelect',
            'exportSessionSelect',
            'exportJsonBtn',
            'exportActionsCsvBtn',
            'exportRequestsCsvBtn',
            'exportTimelineCsvBtn',
            'exportParticipantsCsvBtn',
            'sessionsList',
            'statsGrid',
            'recentActivity',
            'activeParticipants',
            'sessionName',
            'headerMove',
            'headerPhase',
            'participantsSelectionState',
            'participantsList',
            'exportSelectionState',
            'sessionDetailSection'
        ].map((id) => [id, createElement()]));

        elements.sessionDetailSection.style.display = 'none';

        global.document = {
            getElementById(id) {
                return elements[id] || null;
            },
            createElement() {
                return createElement();
            },
            querySelector() {
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };
    });

    afterEach(() => {
        vi.resetModules();
        delete global.document;
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
    });

    it('subscribes to shared stores and initializes sync for the selected session', async () => {
        const { GameMasterController } = await loadGameMasterModule();
        const controller = new GameMasterController();

        await controller.init();
        await controller.handleSessionSelectionChange('session-gm-1');

        expect(mockGameStateStore.subscribe).toHaveBeenCalledTimes(1);
        expect(mockActionsStore.subscribe).toHaveBeenCalledTimes(1);
        expect(mockRequestsStore.subscribe).toHaveBeenCalledTimes(1);
        expect(mockTimelineStore.subscribe).toHaveBeenCalledTimes(1);
        expect(mockParticipantsStore.subscribe).toHaveBeenCalledTimes(1);
        expect(mockSyncService.initialize).toHaveBeenCalledWith('session-gm-1');
    });

    it('wires each live export button to the matching JSON or CSV action', async () => {
        const { GameMasterController } = await loadGameMasterModule();
        const controller = new GameMasterController();
        const exportSpy = vi.fn();

        controller.exportData = exportSpy;
        controller.bindEventListeners();

        elements.exportJsonBtn.click();
        elements.exportActionsCsvBtn.click();
        elements.exportRequestsCsvBtn.click();
        elements.exportTimelineCsvBtn.click();
        elements.exportParticipantsCsvBtn.click();

        expect(exportSpy.mock.calls).toEqual([
            ['json'],
            ['csv-actions'],
            ['csv-requests'],
            ['csv-timeline'],
            ['csv-participants']
        ]);
    });

    it('disables JSON and CSV exports until a session is selected', async () => {
        const { GameMasterController } = await loadGameMasterModule();
        const controller = new GameMasterController();

        controller.updateExportAvailability(null);

        expect(elements.exportSelectionState.textContent).toBe('Select a session before exporting JSON or CSV data.');
        expect(elements.exportJsonBtn.disabled).toBe(true);
        expect(elements.exportActionsCsvBtn.disabled).toBe(true);
        expect(elements.exportRequestsCsvBtn.disabled).toBe(true);
        expect(elements.exportTimelineCsvBtn.disabled).toBe(true);
        expect(elements.exportParticipantsCsvBtn.disabled).toBe(true);
    });
});
