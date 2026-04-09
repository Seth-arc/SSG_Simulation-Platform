import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const FACILITATOR_HTML_PATH = new URL('../../teams/blue/facilitator.html', import.meta.url);

const showToast = vi.fn();
const showModal = vi.fn();
const createTimelineEvent = vi.fn();
const createAction = vi.fn();
const updateDraftAction = vi.fn();
const submitActionRecord = vi.fn();
const deleteDraftAction = vi.fn();
const createRequest = vi.fn();

vi.mock('../components/ui/Toast.js', () => ({
    showToast
}));

vi.mock('../components/ui/Modal.js', () => ({
    showModal,
    confirmModal: vi.fn()
}));

vi.mock('../components/ui/Loader.js', () => ({
    showLoader: vi.fn(() => ({})),
    hideLoader: vi.fn(),
    showInlineLoader: vi.fn(() => ({
        hide: vi.fn()
    }))
}));

vi.mock('../services/database.js', () => ({
    database: {
        createAction,
        updateDraftAction,
        submitAction: submitActionRecord,
        deleteDraftAction,
        createRequest,
        createTimelineEvent,
        fetchActions: vi.fn(),
        fetchRequests: vi.fn(),
        fetchCommunications: vi.fn(),
        fetchTimeline: vi.fn()
    }
}));

async function loadFacilitatorModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./facilitator.js');
}

describe('Facilitator observer enforcement', () => {
    afterEach(() => {
        vi.clearAllMocks();
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
    });

    it('keeps observer access team-scoped', async () => {
        const { getFacilitatorAccessState } = await loadFacilitatorModule();
        const teamContext = {
            teamId: 'blue',
            facilitatorRole: 'blue_facilitator'
        };

        expect(getFacilitatorAccessState({
            role: 'viewer',
            teamContext,
            observerTeamId: 'blue'
        })).toMatchObject({
            allowed: true,
            readOnly: true,
            reason: null
        });

        expect(getFacilitatorAccessState({
            role: 'viewer',
            teamContext,
            observerTeamId: 'red'
        })).toMatchObject({
            allowed: false,
            readOnly: true,
            reason: 'observer-team-mismatch',
            observerTeamId: 'red'
        });
    });

    it('blocks observer write paths in controller code', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();
        controller.isReadOnly = true;

        controller.showCreateActionModal();
        controller.showCreateRfiModal();
        await controller.handleCreateAction();
        await controller.handleUpdateAction(null, 'action-1');
        await controller.submitAction('action-1');
        await controller.deleteAction('action-1');
        await controller.handleCreateRfi();
        await controller.handleCaptureSubmit({
            preventDefault: vi.fn()
        });

        expect(showModal).not.toHaveBeenCalled();
        expect(createAction).not.toHaveBeenCalled();
        expect(updateDraftAction).not.toHaveBeenCalled();
        expect(submitActionRecord).not.toHaveBeenCalled();
        expect(deleteDraftAction).not.toHaveBeenCalled();
        expect(createRequest).not.toHaveBeenCalled();
        expect(createTimelineEvent).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith({
            message: 'Observer mode is read-only on the facilitator page.',
            type: 'error'
        });
    });

    it('ships a Tribe Street Journal panel in the facilitator responses view', () => {
        const html = readFileSync(FACILITATOR_HTML_PATH, 'utf8');

        expect(html).toContain('Tribe Street Journal');
        expect(html).toContain('id="tribeStreetJournalList"');
    });

    it('builds Tribe Street Journal entries from team capture events only', async () => {
        const { buildTribeStreetJournalEntries } = await loadFacilitatorModule();

        const entries = buildTribeStreetJournalEntries([
            {
                id: 'blue-note',
                team: 'blue',
                type: 'NOTE',
                content: 'Blue team observation',
                created_at: '2026-04-09T10:05:00.000Z'
            },
            {
                id: 'blue-quote',
                team: 'blue',
                type: 'QUOTE',
                content: 'Quoted minister',
                created_at: '2026-04-09T10:06:00.000Z'
            },
            {
                id: 'blue-save-event',
                team: 'blue',
                type: 'NOTE',
                content: 'Saved notetaker note',
                created_at: '2026-04-09T10:07:00.000Z',
                metadata: {
                    source: 'notetaker_save'
                }
            },
            {
                id: 'white-cell-note',
                team: 'white_cell',
                type: 'NOTE',
                content: 'White Cell note',
                created_at: '2026-04-09T10:08:00.000Z'
            },
            {
                id: 'blue-action',
                team: 'blue',
                type: 'ACTION_CREATED',
                content: 'Action created',
                created_at: '2026-04-09T10:09:00.000Z'
            }
        ], 'blue');

        expect(entries.map((entry) => entry.id)).toEqual([
            'blue-quote',
            'blue-note'
        ]);
    });
});
