import { afterEach, describe, expect, it, vi } from 'vitest';

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
});
