/**
 * Facilitator Role Controller
 * ESG Economic Statecraft Simulation Platform v2.0
 */

import { sessionStore } from '../stores/session.js';
import { gameStateStore } from '../stores/gameState.js';
import { actionsStore } from '../stores/actions.js';
import { requestsStore } from '../stores/requests.js';
import { timelineStore } from '../stores/timeline.js';
import { communicationsStore } from '../stores/communications.js';
import { database } from '../services/database.js';
import { syncService } from '../services/sync.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader } from '../components/ui/Loader.js';
import { showModal, confirmModal } from '../components/ui/Modal.js';
import {
    createBadge,
    createOutcomeBadge,
    createPriorityBadge,
    createStatusBadge
} from '../components/ui/Badge.js';
import { formatDateTime, formatRelativeTime } from '../utils/formatting.js';
import { validateAction } from '../utils/validation.js';
import {
    ENUMS,
    canDeleteAction,
    canEditAction,
    canSubmitAction,
    isAdjudicatedAction,
    isSubmittedAction
} from '../core/enums.js';
import { getRoleRoute, getTeamResponseTargets, resolveTeamContext } from '../core/teamContext.js';
import { navigateToApp } from '../core/navigation.js';

const logger = createLogger('Facilitator');

export function getFacilitatorAccessState({
    role,
    teamContext,
    observerTeamId = null
}) {
    if (role === teamContext.facilitatorRole) {
        return {
            allowed: true,
            readOnly: false,
            reason: null
        };
    }

    if (role === ENUMS.ROLES.VIEWER && observerTeamId === teamContext.teamId) {
        return {
            allowed: true,
            readOnly: true,
            reason: null
        };
    }

    if (role === ENUMS.ROLES.VIEWER) {
        return {
            allowed: false,
            readOnly: true,
            reason: 'observer-team-mismatch',
            observerTeamId
        };
    }

    return {
        allowed: false,
        readOnly: false,
        reason: 'role-mismatch'
    };
}

export class FacilitatorController {
    constructor() {
        this.actions = [];
        this.rfis = [];
        this.responses = [];
        this.timelineEvents = [];
        this.storeUnsubscribers = [];
        this.role = sessionStore.getRole();
        this.isReadOnly = false;
        this.teamContext = resolveTeamContext();
        this.teamId = this.teamContext.teamId;
        this.teamLabel = this.teamContext.teamLabel;
        this.responseTargets = getTeamResponseTargets(this.teamId);
    }

    async init() {
        logger.info('Initializing Facilitator interface');

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({
                message: 'No session found. Please join a session first.',
                type: 'error'
            });
            setTimeout(() => {
                navigateToApp('');
            }, 2000);
            return;
        }

        this.role = sessionStore.getRole() || sessionStore.getSessionData()?.role;
        const observerTeamId = sessionStore.getSessionData()?.team || null;
        const accessState = getFacilitatorAccessState({
            role: this.role,
            teamContext: this.teamContext,
            observerTeamId
        });

        if (!accessState.allowed) {
            const redirectPath = accessState.reason === 'observer-team-mismatch' && accessState.observerTeamId
                ? getRoleRoute(ENUMS.ROLES.VIEWER, { observerTeamId: accessState.observerTeamId })
                : '';
            showToast({
                message: accessState.reason === 'observer-team-mismatch'
                    ? 'Observer access is limited to the team selected when you joined the session.'
                    : `This page is only available to the ${this.teamLabel} Facilitator or Observer role.`,
                type: 'error'
            });
            navigateToApp(redirectPath || '', { replace: true });
            return;
        }

        this.isReadOnly = accessState.readOnly;

        await syncService.initialize(sessionId, {
            participantId: sessionStore.getSessionParticipantId?.() || null
        });
        this.configureAccessMode();
        this.bindEventListeners();
        this.subscribeToLiveData();
        this.syncActionsFromStore();
        this.syncRfisFromStore();
        this.syncResponsesFromStores();
        this.syncTimelineFromStore();

        logger.info('Facilitator interface initialized');
    }

    isAllowedRole(role) {
        return role === this.teamContext.facilitatorRole || role === ENUMS.ROLES.VIEWER;
    }

    configureAccessMode() {
        const roleLabel = document.getElementById('sessionRoleLabel');
        const notice = document.getElementById('facilitatorModeNotice');
        const writeControls = document.querySelectorAll('[data-write-control="true"]');
        const headerTitle = document.querySelector('.header-title');
        const captureNavItem = document.getElementById('captureNavItem');
        const captureSection = document.getElementById('captureSection');
        const actionsDescription = document.querySelector('#actionsSection .section-description');
        const requestsDescription = document.querySelector('#requestsSection .section-description');
        const responsesDescription = document.querySelector('#responsesSection .section-description');
        const timelineDescription = document.querySelector('#timelineSection .section-description');

        document.body.dataset.facilitatorMode = this.isReadOnly ? 'observer' : 'facilitator';

        if (roleLabel) {
            roleLabel.textContent = this.isReadOnly ? 'Observer' : 'Facilitator';
        }

        if (headerTitle) {
            headerTitle.textContent = this.isReadOnly
                ? this.teamContext.observerLabel
                : this.teamContext.facilitatorLabel;
        }

        writeControls.forEach((element) => {
            element.hidden = this.isReadOnly;
            element.toggleAttribute('aria-hidden', this.isReadOnly);

            element.querySelectorAll?.('button, input, select, textarea').forEach((control) => {
                control.disabled = this.isReadOnly;
                control.toggleAttribute('aria-disabled', this.isReadOnly);
            });
        });

        if (captureNavItem) {
            captureNavItem.hidden = this.isReadOnly;
        }

        if (captureSection && this.isReadOnly) {
            captureSection.style.display = 'none';
        }

        if (actionsDescription) {
            actionsDescription.textContent = this.isReadOnly
                ? 'Passive observer view of facilitator actions. Drafts are visible but cannot be created, edited, submitted, or deleted.'
                : 'Draft actions, submit them to White Cell, and track adjudication results.';
        }

        if (requestsDescription) {
            requestsDescription.textContent = this.isReadOnly
                ? 'Passive observer view of RFIs and responses. Request submission is disabled in observer mode.'
                : 'Submit questions to White Cell and monitor the response status.';
        }

        if (responsesDescription) {
            responsesDescription.textContent = this.isReadOnly
                ? 'Passive feed of White Cell responses to this team.'
                : 'View responses to your RFIs and communications';
        }

        if (timelineDescription) {
            timelineDescription.textContent = this.isReadOnly
                ? 'Passive session activity feed for the selected team.'
                : 'Chronological view of all events';
        }

        if (notice) {
            if (this.isReadOnly) {
                notice.style.display = 'block';
                notice.innerHTML = `
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is passive for the observer role. You can review facilitator actions,
                        White Cell responses, RFIs, and the timeline, but create, edit, submit, delete,
                        and capture paths are blocked in code and hidden in the interface.
                    </p>
                `;
            } else {
                notice.style.display = 'block';
                notice.innerHTML = `
                    <h2 class="font-semibold mb-2">Action Lifecycle</h2>
                    <p class="text-sm text-gray-600">
                        Draft actions stay editable until you submit them to White Cell. Submitted
                        actions become read-only and remain in review until White Cell adjudicates them.
                    </p>
                `;
            }
        }
    }

    bindEventListeners() {
        const newActionBtn = document.getElementById('newActionBtn');
        const newRfiBtn = document.getElementById('newRfiBtn');
        const captureForm = document.getElementById('captureForm');

        if (this.isReadOnly) {
            newActionBtn?.setAttribute('aria-disabled', 'true');
            newRfiBtn?.setAttribute('aria-disabled', 'true');
            captureForm?.querySelectorAll?.('button, input, select, textarea').forEach((control) => {
                control.disabled = true;
                control.setAttribute('aria-disabled', 'true');
            });
            return;
        }

        newActionBtn?.addEventListener('click', () => this.showCreateActionModal());
        newRfiBtn?.addEventListener('click', () => this.showCreateRfiModal());
        captureForm?.addEventListener('submit', (event) => this.handleCaptureSubmit(event));
    }

    requireWriteAccess() {
        if (!this.isReadOnly) {
            return true;
        }

        showToast({
            message: 'Observer mode is read-only on the facilitator page.',
            type: 'error'
        });
        return false;
    }

    getCurrentGameState() {
        return gameStateStore.getState() || sessionStore.getSessionData()?.gameState || {
            move: 1,
            phase: 1
        };
    }

    subscribeToLiveData() {
        this.storeUnsubscribers.push(
            actionsStore.subscribe(() => {
                this.syncActionsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            requestsStore.subscribe(() => {
                this.syncRfisFromStore();
                this.syncResponsesFromStores();
            })
        );

        this.storeUnsubscribers.push(
            communicationsStore.subscribe(() => {
                this.syncResponsesFromStores();
            })
        );

        this.storeUnsubscribers.push(
            timelineStore.subscribe(() => {
                this.syncTimelineFromStore();
            })
        );
    }

    syncActionsFromStore() {
        this.actions = actionsStore.getByTeam(this.teamId);
        this.renderActionsList();

        const badge = document.getElementById('actionsBadge');
        if (badge) {
            badge.textContent = this.actions.length.toString();
        }
    }

    syncRfisFromStore() {
        this.rfis = requestsStore.getByTeam(this.teamId);
        this.renderRfiList();

        const badge = document.getElementById('rfiBadge');
        if (badge) {
            badge.textContent = this.rfis.filter((request) => request.status === 'pending').length.toString();
        }
    }

    syncResponsesFromStores() {
        const answeredRfis = requestsStore.getByTeam(this.teamId)
            .filter((request) => request.status === 'answered' && request.response)
            .map((request) => ({
                id: request.id,
                kind: 'rfi',
                created_at: request.responded_at || request.updated_at || request.created_at,
                title: request.query || request.question || 'RFI response',
                content: request.response,
                status: request.status,
                priority: request.priority
            }));

        const directResponses = communicationsStore.getAll()
            .filter((communication) =>
                communication.from_role === 'white_cell'
                && this.responseTargets.has(communication.to_role)
            )
            .map((communication) => ({
                id: communication.id,
                kind: 'communication',
                created_at: communication.created_at,
                title: this.formatCommunicationTarget(communication.to_role),
                content: communication.content,
                type: communication.type || 'MESSAGE'
            }));

        this.responses = [...answeredRfis, ...directResponses].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        this.renderResponsesList();
    }

    syncTimelineFromStore() {
        this.timelineEvents = timelineStore.getAll()
            .filter((event) => [this.teamId, 'white_cell'].includes(event.team))
            .slice(0, 50);
        this.renderTimeline();
    }

    renderActionsList() {
        const actionsList = document.getElementById('actionsList');
        if (!actionsList) return;

        if (this.actions.length === 0) {
            actionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Actions Yet</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly
                            ? 'No facilitator actions have been created yet.'
                            : 'Create your first strategic action to start the draft to White Cell review flow.'}
                    </p>
                </div>
            `;
            return;
        }

        actionsList.innerHTML = this.actions.map((action) => this.renderActionCard(action)).join('');

        actionsList.querySelectorAll('.edit-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.showEditActionModal(action);
                }
            });
        });

        actionsList.querySelectorAll('.submit-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.confirmSubmitAction(action);
                }
            });
        });

        actionsList.querySelectorAll('.delete-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.confirmDeleteAction(action);
                }
            });
        });
    }

    renderActionCard(action) {
        const goal = action.goal || action.title || 'Untitled action';
        const expectedOutcomes = action.expected_outcomes || action.description || 'No expected outcomes';
        const targets = Array.isArray(action.targets)
            ? action.targets
            : (action.target ? [action.target] : []);
        const targetLabel = targets.length ? targets.join(', ') : 'Not specified';
        const status = action.status || ENUMS.ACTION_STATUS.DRAFT;
        const canManageDraft = !this.isReadOnly && canEditAction(action);
        const canSubmitDraft = !this.isReadOnly && canSubmitAction(action);
        const canRemoveDraft = !this.isReadOnly && canDeleteAction(action);
        const outcomeBadge = action.outcome
            ? createOutcomeBadge(action.outcome).outerHTML
            : '';

        let lifecycleMessage = `
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the facilitator.
            </p>
        `;

        if (isSubmittedAction(action)) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${action.submitted_at ? formatRelativeTime(action.submitted_at) : ''}.
                    This action is now read-only for facilitators until adjudication.
                </p>
            `;
        } else if (isAdjudicatedAction(action)) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${action.adjudicated_at ? formatRelativeTime(action.adjudicated_at) : ''}.
                </p>
            `;
        } else if (this.isReadOnly) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Observer mode is read-only. Draft actions are visible but cannot be changed from this page.
                </p>
            `;
        }

        return `
            <div class="card card-bordered" data-action-id="${action.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="card-title">${this.escapeHtml(goal)}</h3>
                        <p class="card-subtitle text-sm text-gray-500">
                            ${this.escapeHtml(action.mechanism || 'No mechanism')} | Move ${action.move || 1} | Phase ${action.phase || 1}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                        ${createStatusBadge(status).outerHTML}
                        ${createPriorityBadge(action.priority || 'NORMAL').outerHTML}
                        ${outcomeBadge}
                    </div>
                </div>

                <div class="card-body">
                    <p class="text-sm mb-3">${this.escapeHtml(expectedOutcomes)}</p>
                    ${action.ally_contingencies ? `
                        <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                            <strong>Ally Contingencies:</strong> ${this.escapeHtml(action.ally_contingencies)}
                        </p>
                    ` : ''}
                    <p class="text-xs text-gray-500">
                        <strong>Targets:</strong> ${this.escapeHtml(targetLabel)} |
                        <strong>Sector:</strong> ${this.escapeHtml(action.sector || 'Not specified')} |
                        <strong>Exposure:</strong> ${this.escapeHtml(action.exposure_type || 'Not specified')}
                    </p>
                    ${action.adjudication_notes ? `
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(action.adjudication_notes)}
                        </p>
                    ` : ''}
                    ${lifecycleMessage}
                </div>

                ${(canManageDraft || canSubmitDraft || canRemoveDraft) ? `
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${canManageDraft ? `
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${action.id}">
                                Edit Draft
                            </button>
                        ` : ''}
                        ${canSubmitDraft ? `
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${action.id}">
                                Submit to White Cell
                            </button>
                        ` : ''}
                        ${canRemoveDraft ? `
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${action.id}">
                                Delete Draft
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    showCreateActionModal() {
        if (!this.requireWriteAccess()) return;

        const content = this.createActionFormContent();
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: 'Create New Action',
            content,
            size: 'lg',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Save Draft',
                    variant: 'primary',
                    onClick: () => {
                        this.handleCreateAction(modalRef.current).catch((err) => {
                            logger.error('Failed to create action:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    showEditActionModal(action) {
        if (!this.requireWriteAccess()) return;
        if (!canEditAction(action)) {
            showToast({ message: 'Only draft actions can be edited.', type: 'error' });
            return;
        }

        const content = this.createActionFormContent(action);
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: 'Edit Draft Action',
            content,
            size: 'lg',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Save Changes',
                    variant: 'primary',
                    onClick: () => {
                        this.handleUpdateAction(modalRef.current, action.id).catch((err) => {
                            logger.error('Failed to update action:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    createActionFormContent(action = {}) {
        const content = document.createElement('div');
        const selectedTargets = Array.isArray(action.targets)
            ? action.targets
            : (action.target ? [action.target] : []);

        const mechanismOptions = ENUMS.MECHANISMS
            .map((value) => `<option value="${value}" ${action.mechanism === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const sectorOptions = ENUMS.SECTORS
            .map((value) => `<option value="${value}" ${action.sector === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const exposureOptions = ENUMS.EXPOSURE_TYPES
            .map((value) => `<option value="${value}" ${action.exposure_type === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const targetOptions = ENUMS.TARGETS
            .map((value) => `<option value="${value}" ${selectedTargets.includes(value) ? 'selected' : ''}>${value}</option>`)
            .join('');

        const priorityOptions = ENUMS.PRIORITY
            .map((value) => `<option value="${value}" ${(action.priority || 'NORMAL') === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        content.innerHTML = `
            <form id="actionForm">
                <div class="form-group">
                    <label class="form-label" for="actionGoal">Goal *</label>
                    <textarea id="actionGoal" class="form-input form-textarea" rows="3" required>${this.escapeHtml(action.goal || action.title || '')}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionMechanism">Mechanism *</label>
                        <select id="actionMechanism" class="form-select" required>
                            <option value="">Select mechanism</option>
                            ${mechanismOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionSector">Sector *</label>
                        <select id="actionSector" class="form-select" required>
                            <option value="">Select sector</option>
                            ${sectorOptions}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${exposureOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${priorityOptions}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionTargets">Targets *</label>
                    <select id="actionTargets" class="form-select" multiple size="5" required>
                        ${targetOptions}
                    </select>
                    <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                    <textarea id="actionExpectedOutcomes" class="form-input form-textarea" rows="4" required>${this.escapeHtml(action.expected_outcomes || action.description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionAllyContingencies">Ally Contingencies *</label>
                    <textarea id="actionAllyContingencies" class="form-input form-textarea" rows="3" required>${this.escapeHtml(action.ally_contingencies || '')}</textarea>
                </div>
            </form>
        `;

        return content;
    }

    getActionFormData() {
        const targetsSelect = document.getElementById('actionTargets');
        const formData = {
            goal: document.getElementById('actionGoal')?.value?.trim(),
            mechanism: document.getElementById('actionMechanism')?.value,
            sector: document.getElementById('actionSector')?.value,
            exposure_type: document.getElementById('actionExposureType')?.value || null,
            priority: document.getElementById('actionPriority')?.value || 'NORMAL',
            targets: targetsSelect
                ? Array.from(targetsSelect.selectedOptions).map((option) => option.value)
                : [],
            expected_outcomes: document.getElementById('actionExpectedOutcomes')?.value?.trim(),
            ally_contingencies: document.getElementById('actionAllyContingencies')?.value?.trim()
        };

        const result = validateAction(formData);
        if (!result.valid) {
            showToast({ message: result.errors[0] || 'Action validation failed', type: 'error' });
            return null;
        }

        return formData;
    }

    async handleCreateAction(modal) {
        if (!this.requireWriteAccess()) return;

        const formData = this.getActionFormData();
        if (!formData) return;

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Saving draft...' });

        try {
            const gameState = this.getCurrentGameState();
            const action = await database.createAction({
                ...formData,
                session_id: sessionId,
                client_id: sessionStore.getClientId(),
                team: this.teamId,
                status: ENUMS.ACTION_STATUS.DRAFT,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            actionsStore.updateFromServer('INSERT', action);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_CREATED',
                content: `Draft action created: ${action.goal || 'Untitled action'}`,
                metadata: { related_id: action.id },
                team: this.teamId,
                move: action.move ?? 1,
                phase: action.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Draft action saved', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to create action:', err);
            showToast({ message: err.message || 'Failed to save draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async handleUpdateAction(modal, actionId) {
        if (!this.requireWriteAccess()) return;

        const formData = this.getActionFormData();
        if (!formData) return;

        const loader = showLoader({ message: 'Updating draft...' });

        try {
            const updatedAction = await database.updateDraftAction(actionId, formData);
            actionsStore.updateFromServer('UPDATE', updatedAction);
            showToast({ message: 'Draft action updated', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to update action:', err);
            showToast({ message: err.message || 'Failed to update draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async confirmSubmitAction(action) {
        if (!this.requireWriteAccess()) return;
        if (!canSubmitAction(action)) {
            showToast({ message: 'Only draft actions can be submitted.', type: 'error' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Submit Action',
            message: 'Submit this draft to White Cell for review? After submission it becomes read-only for facilitators.',
            confirmLabel: 'Submit',
            variant: 'primary'
        });

        if (!confirmed) return;
        await this.submitAction(action.id);
    }

    async submitAction(actionId) {
        if (!this.requireWriteAccess()) return;
        const loader = showLoader({ message: 'Submitting action...' });

        try {
            const action = await database.submitAction(actionId);
            actionsStore.updateFromServer('UPDATE', action);

            const timelineEvent = await database.createTimelineEvent({
                session_id: action.session_id,
                type: 'ACTION_SUBMITTED',
                content: `Action submitted to White Cell: ${action.goal || 'Untitled action'}`,
                metadata: { related_id: action.id },
                team: this.teamId,
                move: action.move ?? 1,
                phase: action.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Action submitted to White Cell', type: 'success' });
        } catch (err) {
            logger.error('Failed to submit action:', err);
            showToast({ message: err.message || 'Failed to submit action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async confirmDeleteAction(action) {
        if (!this.requireWriteAccess()) return;
        if (!canDeleteAction(action)) {
            showToast({ message: 'Only draft actions can be deleted.', type: 'error' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Delete Draft Action',
            message: 'Delete this draft action? This cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger'
        });

        if (!confirmed) return;
        await this.deleteAction(action.id);
    }

    async deleteAction(actionId) {
        if (!this.requireWriteAccess()) return;
        const loader = showLoader({ message: 'Deleting draft...' });

        try {
            await database.deleteDraftAction(actionId);
            actionsStore.updateFromServer('DELETE', { id: actionId });
            showToast({ message: 'Draft action deleted', type: 'success' });
        } catch (err) {
            logger.error('Failed to delete action:', err);
            showToast({ message: err.message || 'Failed to delete draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    renderRfiList() {
        const rfiList = document.getElementById('rfiList');
        if (!rfiList) return;

        if (this.rfis.length === 0) {
            rfiList.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No RFIs</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly
                            ? `No ${this.teamLabel} RFIs have been submitted yet.`
                            : 'Submit a request for information to White Cell when the team needs clarification.'}
                    </p>
                </div>
            `;
            return;
        }

        rfiList.innerHTML = this.rfis.map((rfi) => {
            const queryText = rfi.query || rfi.question || '';
            return `
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div class="card-header" style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        <span class="text-sm font-semibold">${this.escapeHtml(queryText)}</span>
                        <div style="display: flex; gap: var(--space-2);">
                            ${createStatusBadge(rfi.status || 'pending').outerHTML}
                            ${createPriorityBadge(rfi.priority || 'NORMAL').outerHTML}
                        </div>
                    </div>
                    ${Array.isArray(rfi.categories) && rfi.categories.length ? `
                        <p class="text-xs text-gray-500 mt-2"><strong>Categories:</strong> ${this.escapeHtml(rfi.categories.join(', '))}</p>
                    ` : ''}
                    ${rfi.response ? `
                        <div class="mt-3 p-3 bg-gray-50 rounded">
                            <strong>Response:</strong> ${this.escapeHtml(rfi.response)}
                        </div>
                    ` : ''}
                    <p class="text-xs text-gray-400 mt-2">${formatRelativeTime(rfi.created_at)}</p>
                </div>
            `;
        }).join('');
    }

    showCreateRfiModal() {
        if (!this.requireWriteAccess()) return;

        const content = document.createElement('div');
        const priorityOptions = ENUMS.PRIORITY
            .map((value) => `<option value="${value}">${value}</option>`)
            .join('');
        const categoryOptions = ENUMS.RFI_CATEGORIES
            .map((value) => `<option value="${value}">${value}</option>`)
            .join('');

        content.innerHTML = `
            <form id="rfiForm">
                <div class="form-group">
                    <label class="form-label" for="rfiQuestion">Question *</label>
                    <textarea id="rfiQuestion" class="form-input form-textarea" rows="4" required></textarea>
                </div>
                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="rfiPriority">Priority *</label>
                        <select id="rfiPriority" class="form-select" required>
                            <option value="">Select priority</option>
                            ${priorityOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="rfiCategories">Categories *</label>
                        <select id="rfiCategories" class="form-select" multiple size="4" required>
                            ${categoryOptions}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="rfiContext">Context</label>
                    <textarea id="rfiContext" class="form-input form-textarea" rows="3"></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };
        modalRef.current = showModal({
            title: 'Submit Request for Information',
            content,
            size: 'md',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Submit RFI',
                    variant: 'primary',
                    onClick: () => {
                        this.handleCreateRfi(modalRef.current).catch((err) => {
                            logger.error('Failed to submit RFI:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    async handleCreateRfi(modal) {
        if (!this.requireWriteAccess()) return;

        const question = document.getElementById('rfiQuestion')?.value?.trim();
        const context = document.getElementById('rfiContext')?.value?.trim();
        const priority = document.getElementById('rfiPriority')?.value;
        const categoriesSelect = document.getElementById('rfiCategories');
        const categories = categoriesSelect
            ? Array.from(categoriesSelect.selectedOptions).map((option) => option.value)
            : [];

        if (!question) {
            showToast({ message: 'Question is required', type: 'error' });
            return;
        }

        if (!priority) {
            showToast({ message: 'Priority is required', type: 'error' });
            return;
        }

        if (!categories.length) {
            showToast({ message: 'Select at least one category', type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const loader = showLoader({ message: 'Submitting RFI...' });

        try {
            const gameState = this.getCurrentGameState();
            const query = context ? `${question}\n\nContext: ${context}` : question;
            const rfi = await database.createRequest({
                session_id: sessionId,
                team: this.teamId,
                client_id: sessionStore.getClientId(),
                query,
                priority,
                categories,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            requestsStore.updateFromServer('INSERT', rfi);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'RFI_CREATED',
                content: `${this.teamLabel} submitted an RFI to White Cell.`,
                metadata: { related_id: rfi.id },
                team: this.teamId,
                move: rfi.move ?? 1,
                phase: rfi.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'RFI submitted successfully', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to submit RFI:', err);
            showToast({ message: err.message || 'Failed to submit RFI', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    renderResponsesList() {
        const container = document.getElementById('responsesList');
        if (!container) return;

        if (this.responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and facilitator-directed communications will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.responses.map((response) => {
            const responseBadge = response.kind === 'rfi'
                ? createStatusBadge('answered').outerHTML
                : createBadge({ text: response.type, variant: 'info', size: 'sm', rounded: true }).outerHTML;

            return `
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(response.title)}</h3>
                            <p class="text-xs text-gray-400">${formatDateTime(response.created_at)}</p>
                        </div>
                        ${responseBadge}
                    </div>
                    <p class="text-sm">${this.escapeHtml(response.content || '')}</p>
                </div>
            `;
        }).join('');
    }

    renderTimeline() {
        const container = document.getElementById('timelineList');
        if (!container) return;

        if (this.timelineEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.timelineEvents.map((event) => `
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${createBadge({ text: event.type || 'EVENT', size: 'sm', rounded: true }).outerHTML}
                        <span class="text-xs text-gray-400">${formatDateTime(event.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(event.content || event.description || '')}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(event.team))} | Move ${event.move || 1} | Phase ${event.phase || 1}</p>
                </div>
            </div>
        `).join('');
    }

    async handleCaptureSubmit(event) {
        event.preventDefault();
        if (!this.requireWriteAccess()) return;

        const type = document.querySelector('input[name="captureType"]:checked')?.value;
        const contentInput = document.getElementById('captureContent');
        const content = contentInput?.value?.trim();

        if (!content) {
            showToast({ message: 'Please enter content', type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const loader = showLoader({ message: 'Saving observation...' });

        try {
            const gameState = this.getCurrentGameState();
            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type,
                content,
                team: this.teamId,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Observation saved', type: 'success' });
            if (contentInput) {
                contentInput.value = '';
            }
        } catch (err) {
            logger.error('Failed to save capture:', err);
            showToast({ message: 'Failed to save observation', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    formatCommunicationTarget(target) {
        const labels = {
            all: 'White Cell communication to all teams',
            [this.teamId]: `White Cell communication to ${this.teamLabel}`,
            [this.teamContext.facilitatorRole]: `White Cell communication to ${this.teamContext.facilitatorLabel}`
        };

        return labels[target] || target || 'White Cell communication';
    }

    formatTeamLabel(team) {
        if (team === this.teamId) {
            return this.teamLabel;
        }

        if (team === 'white_cell') {
            return 'White Cell';
        }

        return team || '';
    }

    escapeHtml(value) {
        if (typeof value !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    destroy() {
        this.storeUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
        this.storeUnsubscribers = [];
    }
}

const facilitatorController = new FacilitatorController();

const shouldAutoInitFacilitator = typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    !globalThis.__ESG_DISABLE_AUTO_INIT__;

if (shouldAutoInitFacilitator) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => facilitatorController.init());
    } else {
        facilitatorController.init();
    }

    window.addEventListener('beforeunload', () => facilitatorController.destroy());
}

export default facilitatorController;
