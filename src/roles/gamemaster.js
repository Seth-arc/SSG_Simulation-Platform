import { database } from '../services/database.js';
import { sessionStore } from '../stores/session.js';
import { getRuntimeConfigStatus } from '../services/supabase.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader, showInlineLoader } from '../components/ui/Loader.js';
import { showModal, confirmModal, closeModal } from '../components/ui/Modal.js';
import { createBadge } from '../components/ui/Badge.js';
import { formatRelativeTime } from '../utils/formatting.js';
import { validateSessionCode } from '../utils/validation.js';
import {
    buildJsonExportPayload,
    downloadJsonData,
    downloadCsv,
    exportSessionActionsCsv,
    exportSessionRequestsCsv,
    exportSessionTimelineCsv,
    exportSessionParticipantsCsv,
    openPrintableReportFromData
} from '../features/export/index.js';
import { navigateToApp } from '../core/navigation.js';
import { OPERATOR_SURFACES } from '../core/teamContext.js';

const logger = createLogger('GameMaster');

function getTimestamp(value) {
    return value ? new Date(value).getTime() : 0;
}

function sanitizeFilenamePart(value = 'session') {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'session';
}

function buildFallbackBundle(session) {
    return {
        session,
        gameState: null,
        participants: [],
        actions: [],
        requests: [],
        timeline: []
    };
}

export function getGameMasterAccessState(sessionStoreRef = sessionStore) {
    const role = sessionStoreRef.getRole?.() || sessionStoreRef.getSessionData?.()?.role || null;
    const allowed = role === 'white' && sessionStoreRef.hasOperatorAccess?.(
        OPERATOR_SURFACES.GAME_MASTER,
        { role: 'white' }
    );

    return {
        allowed,
        role
    };
}

export function buildDashboardModel(sessionBundles = []) {
    return {
        activeSessions: sessionBundles.length,
        totalParticipants: sessionBundles.reduce((sum, bundle) => sum + (bundle.participants?.length || 0), 0),
        totalActions: sessionBundles.reduce((sum, bundle) => sum + (bundle.actions?.length || 0), 0),
        pendingRequests: sessionBundles.reduce(
            (sum, bundle) => sum + (bundle.requests?.filter((request) => request.status === 'pending').length || 0),
            0
        )
    };
}

export function buildRecentActivityModel(sessionBundles = [], limit = 8) {
    return sessionBundles
        .flatMap((bundle) => (bundle.timeline || []).map((event) => ({
            ...event,
            sessionId: bundle.session?.id || null,
            sessionName: bundle.session?.name || 'Unknown Session'
        })))
        .sort((left, right) => getTimestamp(right.created_at) - getTimestamp(left.created_at))
        .slice(0, limit);
}

export function buildConnectedParticipantsModel(sessionBundles = [], limit = 10) {
    return sessionBundles
        .flatMap((bundle) => (bundle.participants || []).map((participant) => ({
            ...participant,
            sessionId: bundle.session?.id || null,
            sessionName: bundle.session?.name || 'Unknown Session'
        })))
        .sort((left, right) => {
            return getTimestamp(right.heartbeat_at || right.joined_at) - getTimestamp(left.heartbeat_at || left.joined_at);
        })
        .slice(0, limit);
}

export function getAdminExportButtonConfig({ supportsPdf = true } = {}) {
    const buttons = [
        { id: 'exportJsonBtn', action: 'json', successLabel: 'JSON' },
        { id: 'exportActionsCsvBtn', action: 'csv-actions', successLabel: 'Actions CSV' },
        { id: 'exportRequestsCsvBtn', action: 'csv-requests', successLabel: 'RFIs CSV' },
        { id: 'exportTimelineCsvBtn', action: 'csv-timeline', successLabel: 'Timeline CSV' },
        { id: 'exportParticipantsCsvBtn', action: 'csv-participants', successLabel: 'Participants CSV' }
    ];

    if (supportsPdf) {
        buttons.push({ id: 'exportPdfBtn', action: 'pdf', successLabel: 'Print view' });
    }

    return buttons;
}

export function buildExportSelectionState(sessionBundle = null) {
    if (!sessionBundle?.session) {
        return {
            disabled: true,
            message: 'Select a session before exporting data.'
        };
    }

    return {
        disabled: false,
        message: `Exporting data for ${sessionBundle.session.name}.`
    };
}

export class GameMasterController {
    constructor() {
        this.sessions = [];
        this.currentSessionId = null;
        this.refreshInterval = null;
        this.sessionBundles = new Map();
    }

    async init() {
        logger.info('Initializing Game Master interface');
        const accessState = getGameMasterAccessState(sessionStore);
        if (!accessState.allowed) {
            logger.warn('Blocked direct Game Master access without operator auth');
            showToast('Game Master access requires operator authorization from the landing page.', { type: 'error' });
            navigateToApp('index.html#operatorAccessSection', { replace: true });
            return;
        }

        if (!getRuntimeConfigStatus().ready) {
            logger.error('Game Master page blocked: backend configuration is missing');
            return;
        }
        this.bindEventListeners();
        await this.loadSessions();
        this.startAutoRefresh();
        logger.info('Game Master interface initialized');
    }

    bindEventListeners() {
        const createSessionBtn = document.getElementById('createSessionBtn');
        if (createSessionBtn) {
            createSessionBtn.addEventListener('click', () => this.showCreateSessionModal());
        }

        const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => this.loadSessions());
        }

        const participantsSessionSelect = document.getElementById('participantsSessionSelect');
        if (participantsSessionSelect) {
            participantsSessionSelect.addEventListener('change', (event) => {
                void this.handleSessionSelectionChange(event.target.value);
            });
        }

        const exportSessionSelect = document.getElementById('exportSessionSelect');
        if (exportSessionSelect) {
            exportSessionSelect.addEventListener('change', (event) => {
                void this.handleSessionSelectionChange(event.target.value);
            });
        }

        getAdminExportButtonConfig().forEach(({ id, action }) => {
            const button = document.getElementById(id);
            if (!button) return;

            button.addEventListener('click', () => {
                void this.exportData(action);
            });
        });
    }

    async loadSessions() {
        const sessionsList = document.getElementById('sessionsList');
        const loader = sessionsList
            ? showInlineLoader(sessionsList, { message: 'Loading sessions...', replace: false })
            : null;

        try {
            this.sessions = await database.getActiveSessions() || [];

            if (loader) loader.hide();

            if (this.currentSessionId && !this.sessions.some((session) => session.id === this.currentSessionId)) {
                this.currentSessionId = null;
                const sessionDetailSection = document.getElementById('sessionDetailSection');
                const sessionsSection = document.getElementById('sessionsSection');
                if (sessionDetailSection) sessionDetailSection.style.display = 'none';
                if (sessionsSection) sessionsSection.style.display = 'block';
            }

            this.renderSessionsList();
            this.renderSessionSelectors();
            await this.loadDashboardData();
            await this.refreshSelectedSessionViews();
            logger.info(`Loaded ${this.sessions.length} sessions`);
        } catch (err) {
            logger.error('Failed to load sessions:', err);
            showToast('Failed to load sessions', { type: 'error' });
            if (loader) loader.hide();
        }
    }

    async loadDashboardData() {
        if (this.sessions.length === 0) {
            this.sessionBundles = new Map();
            this.renderDashboardStats(buildDashboardModel([]));
            this.renderRecentActivity([]);
            this.renderActiveParticipants([]);
            return;
        }

        const bundles = await Promise.all(this.sessions.map(async (session) => {
            try {
                return await database.fetchSessionBundle(session.id);
            } catch (error) {
                logger.error('Failed to load session bundle for dashboard:', session.id, error);
                return buildFallbackBundle(session);
            }
        }));

        this.sessionBundles = new Map(bundles.map((bundle) => [bundle.session.id, bundle]));
        this.renderDashboardStats(buildDashboardModel(bundles));
        this.renderRecentActivity(buildRecentActivityModel(bundles));
        this.renderActiveParticipants(buildConnectedParticipantsModel(bundles));
    }

    async handleSessionSelectionChange(sessionId) {
        this.currentSessionId = sessionId || null;
        await this.refreshSelectedSessionViews();
        this.renderSessionsList();
    }

    async ensureSessionBundle(sessionId) {
        if (!sessionId) {
            return null;
        }

        const existingBundle = this.sessionBundles.get(sessionId);
        if (existingBundle) {
            return existingBundle;
        }

        const bundle = await database.fetchSessionBundle(sessionId);
        this.sessionBundles.set(sessionId, bundle);
        return bundle;
    }

    async refreshSelectedSessionViews() {
        this.renderSessionSelectors();

        if (!this.currentSessionId) {
            this.updateHeaderSessionState(null, null);
            this.renderParticipantsPanel(null);
            this.updateExportAvailability(null);
            return;
        }

        try {
            const bundle = await this.ensureSessionBundle(this.currentSessionId);
            this.updateHeaderSessionState(bundle.session, bundle.gameState);
            this.renderParticipantsPanel(bundle);
            this.updateExportAvailability(bundle);

            const sessionDetailSection = document.getElementById('sessionDetailSection');
            if (sessionDetailSection?.style.display !== 'none') {
                this.renderSessionDetails(bundle.session, bundle.participants, bundle.gameState, bundle.actions, bundle.requests);
            }
        } catch (error) {
            logger.error('Failed to refresh selected session views:', error);
            showToast('Failed to refresh selected session views', { type: 'error' });
        }
    }

    updateHeaderSessionState(session, gameState) {
        const sessionName = document.getElementById('sessionName');
        const headerMove = document.getElementById('headerMove');
        const headerPhase = document.getElementById('headerPhase');

        if (sessionName) {
            sessionName.textContent = session ? session.name : 'No Session Selected';
        }

        if (headerMove) {
            headerMove.textContent = gameState?.move ?? '-';
        }

        if (headerPhase) {
            headerPhase.textContent = gameState?.phase ?? '-';
        }
    }

    renderSessionSelectors() {
        ['participantsSessionSelect', 'exportSessionSelect'].forEach((selectId) => {
            const select = document.getElementById(selectId);
            if (!select) return;

            const previousValue = this.currentSessionId || '';
            select.innerHTML = `
                <option value="">Select session</option>
                ${this.sessions.map((session) => {
                    const sessionCode = session.metadata?.session_code || 'N/A';
                    return `<option value="${session.id}">${this.escapeHtml(session.name)} (${sessionCode})</option>`;
                }).join('')}
            `;
            select.value = this.sessions.some((session) => session.id === previousValue) ? previousValue : '';
        });
    }

    renderDashboardStats(stats) {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="card stat-card">
                <span class="stat-label">Active Sessions</span>
                <span class="stat-value">${stats.activeSessions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Active Participants</span>
                <span class="stat-value">${stats.totalParticipants}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Actions Logged</span>
                <span class="stat-value">${stats.totalActions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Pending RFIs</span>
                <span class="stat-value">${stats.pendingRequests}</span>
            </div>
        `;
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!activities.length) {
            container.innerHTML = `
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    No recent activity recorded.
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map((activity) => {
            const activityBadge = createBadge({
                text: activity.type || 'EVENT',
                variant: 'info',
                size: 'sm'
            });

            return `
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div style="display: flex; gap: var(--space-2); align-items: center;">
                            ${activityBadge.outerHTML}
                            <span class="text-sm font-semibold">${this.escapeHtml(activity.sessionName)}</span>
                        </div>
                        <span class="text-xs text-gray-500">${formatRelativeTime(activity.created_at)}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(activity.content || 'No content provided')}</p>
                </div>
            `;
        }).join('');
    }

    renderActiveParticipants(participants) {
        const container = document.getElementById('activeParticipants');
        if (!container) return;

        if (!participants.length) {
            container.innerHTML = `
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    Waiting for connections...
                </div>
            `;
            return;
        }

        container.innerHTML = participants.map((participant) => {
            const roleBadge = createBadge({
                text: participant.role || 'unknown',
                variant: 'primary',
                size: 'sm'
            });

            return `
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-sm font-semibold">${this.escapeHtml(participant.display_name || 'Unknown')}</p>
                            <p class="text-xs text-gray-500">${this.escapeHtml(participant.sessionName)}</p>
                        </div>
                        ${roleBadge.outerHTML}
                    </div>
                    <p class="text-xs text-gray-500">Last active ${formatRelativeTime(participant.heartbeat_at || participant.joined_at)}</p>
                </div>
            `;
        }).join('');
    }

    renderSessionsList() {
        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        if (this.sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Sessions</h3>
                    <p class="empty-state-message">Create your first session to get started</p>
                </div>
            `;
            return;
        }

        sessionsList.innerHTML = this.sessions.map((session) => this.renderSessionCard(session)).join('');

        this.sessions.forEach((session) => {
            const card = sessionsList.querySelector(`[data-session-id="${session.id}"]`);
            if (!card) return;

            const viewBtn = card.querySelector('.view-session-btn');
            const selectBtn = card.querySelector('.select-session-btn');
            const deleteBtn = card.querySelector('.delete-session-btn');

            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    void this.viewSession(session.id);
                });
            }

            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    void this.handleSessionSelectionChange(session.id);
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    void this.confirmDeleteSession(session.id);
                });
            }
        });
    }

    renderSessionCard(session) {
        const isSelected = this.currentSessionId === session.id;
        const statusBadge = createBadge({
            text: session.status || 'active',
            variant: session.status === 'active' ? 'success' : 'default',
            size: 'sm'
        });
        const selectedBadge = isSelected
            ? createBadge({ text: 'Selected', variant: 'primary', size: 'sm' }).outerHTML
            : '';
        const sessionCode = session.metadata?.session_code || 'N/A';

        return `
            <div class="session-card card card-bordered card-hoverable" data-session-id="${session.id}">
                <div class="session-card-header">
                    <div class="session-card-title-group">
                        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                            <h3 class="card-title">${this.escapeHtml(session.name)}</h3>
                            ${selectedBadge}
                        </div>
                        <p class="card-subtitle">Code: <strong>${this.escapeHtml(sessionCode)}</strong></p>
                    </div>
                    ${statusBadge.outerHTML}
                </div>
                <div class="session-card-body">
                    <div class="session-meta">
                        <div class="session-meta-item">
                            <span class="session-meta-label">Status</span>
                            <span class="session-meta-value">${this.escapeHtml(session.status || 'active')}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Created</span>
                            <span class="session-meta-value">${formatRelativeTime(session.created_at)}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Updated</span>
                            <span class="session-meta-value">${formatRelativeTime(session.updated_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="session-card-actions">
                    <button class="btn btn-outline btn-sm select-session-btn">Select</button>
                    <button class="btn btn-primary btn-sm view-session-btn">View Details</button>
                    <button class="btn btn-danger btn-sm delete-session-btn">Delete</button>
                </div>
            </div>
        `;
    }

    showCreateSessionModal() {
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="createSessionForm">
                <div class="form-group">
                    <label class="form-label" for="sessionName">Session Name *</label>
                    <input type="text" id="sessionName" class="form-input" placeholder="e.g., Training Exercise Alpha" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionCode">Session Code *</label>
                    <input type="text" id="sessionCode" class="form-input" placeholder="e.g., ALPHA2024" maxlength="20" required>
                    <p class="form-hint">Alphanumeric, 4-20 characters. Participants use this to join.</p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionDescription">Description</label>
                    <textarea id="sessionDescription" class="form-input form-textarea" rows="3" placeholder="Optional description..."></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };

        modalRef.current = showModal({
            title: 'Create New Session',
            content,
            size: 'md',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Create Session',
                    variant: 'primary',
                    onClick: () => {
                        void this.handleCreateSession(modalRef.current);
                        return false;
                    }
                }
            ]
        });
    }

    async handleCreateSession(modal) {
        const modalElement = modal?.element || document;
        const nameInput = modalElement.querySelector('#sessionName') || document.getElementById('sessionName');
        const codeInput = modalElement.querySelector('#sessionCode') || document.getElementById('sessionCode');
        const descInput = modalElement.querySelector('#sessionDescription') || document.getElementById('sessionDescription');

        if (!nameInput?.value?.trim()) {
            showToast('Session name is required', { type: 'error' });
            nameInput?.focus();
            return;
        }

        const codeError = validateSessionCode(codeInput?.value || '');
        if (codeError) {
            showToast(codeError, { type: 'error' });
            codeInput?.focus();
            return;
        }

        showLoader({ message: 'Creating session...' });

        try {
            const sessionData = {
                name: nameInput.value.trim(),
                session_code: codeInput.value.trim().toUpperCase(),
                description: descInput?.value?.trim() || null,
                status: 'active',
                move: 1,
                phase: 1
            };

            const createdSession = await database.createSession(sessionData);
            showToast('Session created successfully', { type: 'success' });

            if (modal && typeof modal.close === 'function') {
                modal.close();
            } else {
                closeModal();
            }

            this.currentSessionId = createdSession.id;
            await this.loadSessions();
        } catch (err) {
            logger.error('Failed to create session:', err);
            showToast(err.message || 'Failed to create session', { type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async viewSession(sessionId) {
        this.currentSessionId = sessionId;

        const sessionsSection = document.getElementById('sessionsSection');
        const sessionDetailSection = document.getElementById('sessionDetailSection');

        if (sessionsSection) sessionsSection.style.display = 'none';
        if (sessionDetailSection) sessionDetailSection.style.display = 'block';

        this.renderSessionsList();
        await this.refreshSelectedSessionViews();
    }

    renderSessionDetails(session, participants, gameState, actions = [], requests = []) {
        const detailContainer = document.getElementById('sessionDetailContent');
        if (!detailContainer) return;

        const sessionCode = session.metadata?.session_code || 'N/A';
        const currentMove = gameState?.move ?? 1;
        const currentPhase = gameState?.phase ?? 1;
        const pendingRequests = requests.filter((request) => request.status === 'pending').length;

        detailContainer.innerHTML = `
            <div class="session-detail-header" style="margin-bottom: var(--space-6);">
                <button class="btn btn-ghost btn-sm" id="backToListBtn">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width: 1em; height: 1em;">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
                    </svg>
                    Back to Sessions
                </button>
                <h2 class="section-title" style="margin-top: var(--space-3);">${this.escapeHtml(session.name)}</h2>
                <p class="text-gray-500">Code: <strong>${this.escapeHtml(sessionCode)}</strong></p>
            </div>

            <div class="section-grid section-grid-4" style="margin-bottom: var(--space-6);">
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Move</h4>
                    <p class="text-2xl font-bold">${currentMove}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Phase</h4>
                    <p class="text-2xl font-bold">${currentPhase}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Participants</h4>
                    <p class="text-2xl font-bold">${participants.length}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Pending RFIs</h4>
                    <p class="text-2xl font-bold">${pendingRequests}</p>
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Participants</h3>
                <div id="participantsListDetail">
                    ${this.renderParticipantsTable(participants)}
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4); margin-top: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Session Activity Summary</h3>
                <div class="section-grid section-grid-3">
                    <div>
                        <p class="text-sm text-gray-500">Actions</p>
                        <p class="text-xl font-semibold">${actions.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">RFIs</p>
                        <p class="text-xl font-semibold">${requests.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Last Updated</p>
                        <p class="text-sm">${formatRelativeTime(session.updated_at)}</p>
                    </div>
                </div>
            </div>
        `;

        const backBtn = detailContainer.querySelector('#backToListBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const sessionsSection = document.getElementById('sessionsSection');
                const sessionDetailSection = document.getElementById('sessionDetailSection');
                if (sessionsSection) sessionsSection.style.display = 'block';
                if (sessionDetailSection) sessionDetailSection.style.display = 'none';
            });
        }
    }

    renderParticipantsTable(participants) {
        if (!participants.length) {
            return '<p class="text-muted">No participants have joined yet.</p>';
        }

        return `
            <table class="table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Active</th>
                    </tr>
                </thead>
                <tbody>
                    ${participants.map((participant) => {
                        const statusBadge = createBadge({
                            text: participant.is_active ? 'Active' : 'Inactive',
                            variant: participant.is_active ? 'success' : 'default',
                            size: 'sm'
                        });

                        return `
                            <tr>
                                <td>${this.escapeHtml(participant.display_name || 'Unknown')}</td>
                                <td>${this.escapeHtml(participant.role || 'Unknown')}</td>
                                <td>${statusBadge.outerHTML}</td>
                                <td>${participant.heartbeat_at ? formatRelativeTime(participant.heartbeat_at) : 'Never'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    renderParticipantsPanel(sessionBundle) {
        const stateLabel = document.getElementById('participantsSelectionState');
        const container = document.getElementById('participantsList');
        if (!stateLabel || !container) return;

        if (!sessionBundle?.session) {
            stateLabel.textContent = 'Select a session from Session Management to view participants.';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.minHeight = '200px';
            container.innerHTML = `
                <p class="text-gray-500">Select a session from the Session Management tab to view participants</p>
            `;
            return;
        }

        stateLabel.textContent = `Showing participants for ${sessionBundle.session.name}.`;
        container.style.display = 'block';
        container.style.minHeight = 'auto';
        container.innerHTML = `
            <div style="padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4);">
                    <div>
                        <h3 class="text-base font-semibold">${this.escapeHtml(sessionBundle.session.name)}</h3>
                        <p class="text-sm text-gray-500">Code ${this.escapeHtml(sessionBundle.session.metadata?.session_code || 'N/A')}</p>
                    </div>
                    <span class="text-sm text-gray-500">${sessionBundle.participants.length} active participants</span>
                </div>
                ${this.renderParticipantsTable(sessionBundle.participants)}
            </div>
        `;
    }

    updateExportAvailability(sessionBundle) {
        const selectionState = buildExportSelectionState(sessionBundle);
        const exportSelectionState = document.getElementById('exportSelectionState');
        if (exportSelectionState) {
            exportSelectionState.textContent = selectionState.message;
        }

        getAdminExportButtonConfig().forEach(({ id }) => {
            const button = document.getElementById(id);
            if (button) {
                button.disabled = selectionState.disabled;
            }
        });
    }

    async confirmDeleteSession(sessionId) {
        const session = this.sessions.find((entry) => entry.id === sessionId);
        if (!session) return;

        const confirmed = await confirmModal({
            title: 'Delete Session',
            message: `Are you sure you want to delete "${session.name}"? This action cannot be undone and all associated data will be permanently deleted.`,
            confirmText: 'Delete',
            confirmVariant: 'danger'
        });

        if (confirmed) {
            await this.deleteSession(sessionId);
        }
    }

    async deleteSession(sessionId) {
        showLoader({ message: 'Deleting session...' });

        try {
            await database.deleteSession(sessionId);
            this.sessionBundles.delete(sessionId);

            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
            }

            showToast('Session deleted successfully', { type: 'success' });
            await this.loadSessions();
        } catch (err) {
            logger.error('Failed to delete session:', err);
            showToast('Failed to delete session', { type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async exportData(action) {
        if (!this.currentSessionId) {
            showToast('Select a session before exporting.', { type: 'warning' });
            return;
        }

        const exportConfig = getAdminExportButtonConfig().find((config) => config.action === action);
        if (!exportConfig) {
            showToast('Unsupported export action.', { type: 'error' });
            return;
        }

        showLoader({ message: 'Preparing export...' });

        try {
            const bundle = await database.fetchSessionBundle(this.currentSessionId);
            this.sessionBundles.set(this.currentSessionId, bundle);

            const sessionName = sanitizeFilenamePart(bundle.session?.name || this.currentSessionId);
            const sessionCode = sanitizeFilenamePart(bundle.session?.metadata?.session_code || bundle.session?.id || 'session');
            const baseFilename = `esg-${sessionName}-${sessionCode}`;

            switch (action) {
                case 'json':
                    downloadJsonData(buildJsonExportPayload(bundle), `${baseFilename}.json`);
                    break;
                case 'csv-actions':
                    downloadCsv(exportSessionActionsCsv(bundle.actions), `${baseFilename}-actions.csv`);
                    break;
                case 'csv-requests':
                    downloadCsv(exportSessionRequestsCsv(bundle.requests), `${baseFilename}-rfis.csv`);
                    break;
                case 'csv-timeline':
                    downloadCsv(exportSessionTimelineCsv(bundle.timeline), `${baseFilename}-timeline.csv`);
                    break;
                case 'csv-participants':
                    downloadCsv(exportSessionParticipantsCsv(bundle.participants), `${baseFilename}-participants.csv`);
                    break;
                case 'pdf':
                    openPrintableReportFromData(bundle, {
                        title: `ESG Session Report: ${bundle.session?.name || 'Session'}`,
                        includeParticipants: true
                    });
                    break;
                default:
                    throw new Error(`Unhandled export action: ${action}`);
            }

            showToast(`${exportConfig.successLabel} export is ready.`, { type: 'success' });
        } catch (err) {
            logger.error('Export failed:', err);
            showToast('Export failed', { type: 'error' });
        } finally {
            hideLoader();
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            void this.loadSessions();
        }, 60000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

const gameMasterController = new GameMasterController();

const shouldAutoInitGameMaster = typeof document !== 'undefined' &&
    !globalThis.__ESG_DISABLE_AUTO_INIT__;

if (shouldAutoInitGameMaster) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void gameMasterController.init();
        });
    } else {
        void gameMasterController.init();
    }
}

if (typeof window !== 'undefined' && shouldAutoInitGameMaster) {
    window.addEventListener('beforeunload', () => gameMasterController.destroy());
}

export default gameMasterController;
