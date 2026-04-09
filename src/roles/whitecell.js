/**
 * White Cell Role Controller
 * ESG Economic Statecraft Simulation Platform v2.0
 */

import { sessionStore } from '../stores/session.js';
import { gameStateStore } from '../stores/gameState.js';
import { actionsStore } from '../stores/actions.js';
import { requestsStore } from '../stores/requests.js';
import { timelineStore } from '../stores/timeline.js';
import { participantsStore } from '../stores/participants.js';
import { communicationsStore } from '../stores/communications.js';
import { database } from '../services/database.js';
import { syncService } from '../services/sync.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader } from '../components/ui/Loader.js';
import { showModal, confirmModal } from '../components/ui/Modal.js';
import { createBadge, createRoleBadge, createStatusBadge, createPriorityBadge } from '../components/ui/Badge.js';
import { formatDateTime, formatRelativeTime } from '../utils/formatting.js';
import { CONFIG } from '../core/config.js';
import { ENUMS, canAdjudicateAction } from '../core/enums.js';
import { navigateToApp } from '../core/navigation.js';
import {
    OPERATOR_SURFACES,
    ROLE_SURFACES,
    TEAM_OPTIONS,
    WHITE_CELL_OPERATOR_ROLES,
    buildTeamRole,
    getRoleDisplayName,
    parseTeamRole,
    resolveTeamContext
} from '../core/teamContext.js';

const logger = createLogger('WhiteCell');
const WHITE_CELL_ALL_TEAMS_RECIPIENT = 'all';
const TEAM_LABELS = Object.freeze(
    Object.fromEntries(TEAM_OPTIONS.map((team) => [team.id, team.label]))
);
const WHITE_CELL_FILTER_TEAM_ORDER = Object.freeze([
    ...TEAM_OPTIONS.map((team) => team.id),
    'white_cell',
    'observer',
    'system'
]);
const WHITE_CELL_FILTER_ROLE_ORDER = Object.freeze([
    ROLE_SURFACES.FACILITATOR,
    ROLE_SURFACES.NOTETAKER,
    ROLE_SURFACES.WHITECELL,
    ROLE_SURFACES.VIEWER,
    'system'
]);
const WHITE_CELL_TIMELINE_FACILITATOR_TYPES = Object.freeze([
    'ACTION_CREATED',
    'ACTION_SUBMITTED',
    'RFI_CREATED'
]);
const WHITE_CELL_TIMELINE_NOTETAKER_TYPES = Object.freeze([
    'NOTE',
    'MOMENT',
    'QUOTE'
]);

export const WHITE_CELL_DOM_IDS = [
    'startTimerBtn',
    'pauseTimerBtn',
    'resetTimerBtn',
    'prevPhaseBtn',
    'nextPhaseBtn',
    'prevMoveBtn',
    'nextMoveBtn',
    'currentMove',
    'currentPhase',
    'moveLabel',
    'phaseLabel',
    'headerMove',
    'headerPhase',
    'controlTimerDisplay',
    'timerDisplay',
    'timerStatusLabel',
    'timerStatus',
    'actionsBadge',
    'participantsSummary',
    'participantsTeamFilter',
    'participantsRoleFilter',
    'participantsList',
    'actionsList',
    'adjudicationQueue',
    'rfiBadge',
    'rfiQueue',
    'commForm',
    'commRecipient',
    'commType',
    'commContent',
    'commHistory',
    'timelineTeamFilter',
    'timelineRoleFilter',
    'timelineList'
];

export function getWhiteCellDomContract(documentRef = document) {
    const elements = Object.fromEntries(
        WHITE_CELL_DOM_IDS.map((id) => [id, documentRef?.getElementById?.(id) ?? null])
    );

    return {
        elements,
        missing: WHITE_CELL_DOM_IDS.filter((id) => !elements[id])
    };
}

export function getWhiteCellAccessState(teamContext, sessionStoreRef = sessionStore) {
    const sessionId = sessionStoreRef.getSessionId?.() || sessionStoreRef.getSessionData?.()?.id || null;
    const role = sessionStoreRef.getRole?.() || sessionStoreRef.getSessionData?.()?.role || null;
    const parsedRole = parseTeamRole(role);
    const allowedRole = role === teamContext.whitecellLeadRole || role === teamContext.whitecellSupportRole;
    const cachedOperatorAccess = Boolean(
        sessionId &&
        allowedRole &&
        sessionStoreRef.hasOperatorAccess?.(OPERATOR_SURFACES.WHITE_CELL, {
            sessionId,
            role
        })
    );

    return {
        allowed: Boolean(sessionId && allowedRole),
        cachedOperatorAccess,
        sessionId,
        role,
        operatorRole: parsedRole.operatorRole || WHITE_CELL_OPERATOR_ROLES.LEAD
    };
}

function getParticipantTimestamp(participant = {}) {
    return new Date(
        participant.heartbeat_at
        || participant.last_seen
        || participant.joined_at
        || 0
    ).getTime();
}

export function isConnectedParticipant(participant = {}) {
    if (typeof participant?.is_active === 'boolean') {
        return participant.is_active;
    }

    return true;
}

export function isWhiteCellVisibleParticipant(participant = {}, teamId = null) {
    if (!participant || typeof participant !== 'object') {
        return false;
    }

    if (participant.role === 'white') {
        return false;
    }

    const parsedRole = parseTeamRole(participant.role);
    const participantTeam = participant.team
        || participant.team_id
        || (parsedRole.surface === ROLE_SURFACES.WHITECELL ? 'white_cell' : parsedRole.teamId)
        || null;

    if (!teamId) {
        return participant.role === 'viewer' || Boolean(parsedRole.surface);
    }

    if (participant.role === 'viewer') {
        return true;
    }

    return participantTeam === teamId;
}

export function buildWhiteCellParticipantRoster(participants = [], teamId = null) {
    return [...participants]
        .filter((participant) => isWhiteCellVisibleParticipant(participant, teamId))
        .sort((left, right) => {
            const activeDelta = Number(isConnectedParticipant(right)) - Number(isConnectedParticipant(left));
            if (activeDelta !== 0) {
                return activeDelta;
            }

            return getParticipantTimestamp(right) - getParticipantTimestamp(left);
        });
}

export function formatWhiteCellParticipantSummary(participants = []) {
    const total = participants.length;
    const connected = participants.filter((participant) => isConnectedParticipant(participant)).length;

    if (total === 0) {
        return 'No participants have joined this session yet.';
    }

    if (connected === total) {
        return `${connected} connected participant${connected === 1 ? '' : 's'}`;
    }

    return `${connected} connected / ${total} total participants`;
}

function sortWhiteCellFilterValues(values = [], orderedValues = []) {
    return [...values].sort((left, right) => {
        const leftIndex = orderedValues.indexOf(left);
        const rightIndex = orderedValues.indexOf(right);

        if (leftIndex !== -1 || rightIndex !== -1) {
            if (leftIndex === -1) return 1;
            if (rightIndex === -1) return -1;
            if (leftIndex !== rightIndex) return leftIndex - rightIndex;
        }

        return String(left).localeCompare(String(right));
    });
}

export function buildWhiteCellCommunicationRecipientOptions() {
    return [
        {
            value: WHITE_CELL_ALL_TEAMS_RECIPIENT,
            label: 'All Teams'
        },
        ...TEAM_OPTIONS.flatMap((team) => {
            const facilitatorRole = buildTeamRole(team.id, ROLE_SURFACES.FACILITATOR);
            const notetakerRole = buildTeamRole(team.id, ROLE_SURFACES.NOTETAKER);

            return [
                {
                    value: team.id,
                    label: team.label
                },
                {
                    value: facilitatorRole,
                    label: getRoleDisplayName(facilitatorRole)
                },
                {
                    value: notetakerRole,
                    label: getRoleDisplayName(notetakerRole)
                }
            ];
        })
    ];
}

export function getWhiteCellTeamLabel(team = null) {
    if (team === 'white_cell') {
        return 'White Cell';
    }

    return TEAM_LABELS[team] || team || 'Unknown team';
}

export function getWhiteCellFilterTeamLabel(team = null) {
    if (team === 'observer') {
        return 'Observers';
    }

    if (team === 'system') {
        return 'System';
    }

    return getWhiteCellTeamLabel(team);
}

export function getWhiteCellRoleFilterValue(role = null) {
    if (role === 'viewer') {
        return ROLE_SURFACES.VIEWER;
    }

    const parsedRole = parseTeamRole(role);
    return parsedRole.surface || null;
}

export function getWhiteCellFilterRoleLabel(role = null) {
    const labels = {
        [ROLE_SURFACES.FACILITATOR]: 'Facilitators',
        [ROLE_SURFACES.NOTETAKER]: 'Notetakers',
        [ROLE_SURFACES.WHITECELL]: 'White Cell',
        [ROLE_SURFACES.VIEWER]: 'Observers',
        system: 'System'
    };

    return labels[role] || role || 'Unknown role';
}

export function getWhiteCellParticipantTeamFilterValue(participant = {}) {
    if (participant.role === 'viewer') {
        return 'observer';
    }

    const parsedRole = parseTeamRole(participant.role);
    if (parsedRole.surface === ROLE_SURFACES.WHITECELL) {
        return 'white_cell';
    }

    return participant.team || participant.team_id || parsedRole.teamId || null;
}

export function buildWhiteCellParticipantFilterOptions(participants = []) {
    const teamValues = new Set();
    const roleValues = new Set();

    participants.forEach((participant) => {
        const teamValue = getWhiteCellParticipantTeamFilterValue(participant);
        const roleValue = getWhiteCellRoleFilterValue(participant.role);

        if (teamValue) {
            teamValues.add(teamValue);
        }

        if (roleValue) {
            roleValues.add(roleValue);
        }
    });

    return {
        teamOptions: [
            { value: '', label: 'All Teams' },
            ...sortWhiteCellFilterValues(teamValues, WHITE_CELL_FILTER_TEAM_ORDER).map((value) => ({
                value,
                label: getWhiteCellFilterTeamLabel(value)
            }))
        ],
        roleOptions: [
            { value: '', label: 'All Roles' },
            ...sortWhiteCellFilterValues(roleValues, WHITE_CELL_FILTER_ROLE_ORDER).map((value) => ({
                value,
                label: getWhiteCellFilterRoleLabel(value)
            }))
        ]
    };
}

export function filterWhiteCellParticipants(participants = [], {
    team = null,
    role = null
} = {}) {
    return participants.filter((participant) => {
        const participantTeam = getWhiteCellParticipantTeamFilterValue(participant);
        const participantRole = getWhiteCellRoleFilterValue(participant.role);

        if (team && participantTeam !== team) {
            return false;
        }

        if (role && participantRole !== role) {
            return false;
        }

        return true;
    });
}

function resolveWhiteCellTimelineMetadataRole(event = {}) {
    const metadata = event?.metadata && typeof event.metadata === 'object'
        ? event.metadata
        : {};

    return (
        metadata.role
        || metadata.operator_role
        || metadata.answered_by_role
        || metadata.adjudicated_by_role
        || metadata.participant_role
        || event.role
        || null
    );
}

export function getWhiteCellTimelineRoleFilterValue(event = {}) {
    const explicitRole = getWhiteCellRoleFilterValue(resolveWhiteCellTimelineMetadataRole(event));
    if (explicitRole) {
        return explicitRole;
    }

    const eventType = event.type || event.event_type || null;
    const actor = String(event?.metadata?.actor || '').toLowerCase();

    if (event.team === 'white_cell') {
        return ROLE_SURFACES.WHITECELL;
    }

    if (WHITE_CELL_TIMELINE_FACILITATOR_TYPES.includes(eventType)) {
        return ROLE_SURFACES.FACILITATOR;
    }

    if (WHITE_CELL_TIMELINE_NOTETAKER_TYPES.includes(eventType)) {
        if (actor.includes('facilitator')) {
            return ROLE_SURFACES.FACILITATOR;
        }

        if (
            actor.includes('notetaker')
            || event?.metadata?.source === 'notetaker_save'
            || event?.metadata?.note_scope
        ) {
            return ROLE_SURFACES.NOTETAKER;
        }
    }

    return null;
}

export function buildWhiteCellTimelineFilterOptions(events = []) {
    const teamValues = new Set();
    const roleValues = new Set();

    events.forEach((event) => {
        const teamValue = event.team || null;
        const roleValue = getWhiteCellTimelineRoleFilterValue(event);

        if (teamValue) {
            teamValues.add(teamValue);
        }

        if (roleValue) {
            roleValues.add(roleValue);
        }
    });

    return {
        teamOptions: [
            { value: '', label: 'All Teams' },
            ...sortWhiteCellFilterValues(teamValues, WHITE_CELL_FILTER_TEAM_ORDER).map((value) => ({
                value,
                label: getWhiteCellFilterTeamLabel(value)
            }))
        ],
        roleOptions: [
            { value: '', label: 'All Roles' },
            ...sortWhiteCellFilterValues(roleValues, WHITE_CELL_FILTER_ROLE_ORDER).map((value) => ({
                value,
                label: getWhiteCellFilterRoleLabel(value)
            }))
        ]
    };
}

export function filterWhiteCellTimelineEvents(events = [], {
    team = null,
    role = null
} = {}) {
    return events.filter((event) => {
        const timelineRole = getWhiteCellTimelineRoleFilterValue(event);

        if (team && event.team !== team) {
            return false;
        }

        if (role && timelineRole !== role) {
            return false;
        }

        return true;
    });
}

export class WhiteCellController {
    constructor() {
        this.actions = [];
        this.rfis = [];
        this.communications = [];
        this.participants = [];
        this.timelineEvents = [];
        this.storeUnsubscribers = [];
        this.currentTimerSeconds = CONFIG.DEFAULT_TIMER_SECONDS;
        this.timerRunning = false;
        this.participantFilters = {
            team: null,
            role: null
        };
        this.timelineFilters = {
            team: null,
            role: null
        };
        this.teamContext = resolveTeamContext();
        this.teamId = null;
        this.operatorRole = WHITE_CELL_OPERATOR_ROLES.LEAD;
    }

    async init() {
        logger.info('Initializing White Cell interface');

        const accessState = getWhiteCellAccessState(this.teamContext, sessionStore);
        if (!accessState.allowed) {
            showToast({
                message: `${this.teamContext.whitecellLabel} requires operator authorization from the landing page.`,
                type: 'error'
            });
            navigateToApp('index.html#operatorAccessSection', { replace: true });
            return;
        }

        try {
            const grant = await database.requireOperatorGrant(OPERATOR_SURFACES.WHITE_CELL, {
                sessionId: accessState.sessionId,
                role: accessState.role
            });
            sessionStore.setOperatorAuth({
                ...grant,
                sessionId: grant?.sessionId || accessState.sessionId,
                teamId: grant?.teamId || null,
                role: grant?.role || accessState.role
            });
        } catch (error) {
            logger.warn('Blocked White Cell access after failed server verification', error);
            sessionStore.clearOperatorAuth();
            showToast({
                message: `${this.teamContext.whitecellLabel} requires a valid server-side operator grant.`,
                type: 'error'
            });
            navigateToApp('index.html#operatorAccessSection', { replace: true });
            return;
        }

        this.operatorRole = accessState.operatorRole || WHITE_CELL_OPERATOR_ROLES.LEAD;
        const sessionId = accessState.sessionId;

        await syncService.initialize(sessionId, {
            participantId: sessionStore.getSessionParticipantId?.() || null
        });
        this.configureTeamLabels();
        this.bindEventListeners();
        this.subscribeToLiveData();
        this.syncGameStateFromStore(gameStateStore.getState() || sessionStore.getSessionData()?.gameState || null);
        this.syncActionsFromStore();
        this.syncRfisFromStore();
        this.syncCommunicationsFromStore();
        this.syncTimelineFromStore();
        this.syncParticipantsFromStore();
        this.updateTimerDisplay();
        this.updateTimerStatusDisplay();

        logger.info('White Cell interface initialized');
    }

    configureTeamLabels() {
        const headerTitle = document.querySelector('.header-title');
        const recipientSelect = document.getElementById('commRecipient');
        if (headerTitle) {
            headerTitle.textContent = this.isLeadOperator()
                ? 'White Cell Lead'
                : 'White Cell Support';
        }
        if (recipientSelect) {
            this.configureCommunicationRecipients(recipientSelect);
        }
    }

    configureCommunicationRecipients(recipientSelect) {
        const currentValue = recipientSelect.value || WHITE_CELL_ALL_TEAMS_RECIPIENT;
        const options = buildWhiteCellCommunicationRecipientOptions();

        recipientSelect.innerHTML = options.map((option) => (
            `<option value="${option.value}">${this.escapeHtml(option.label)}</option>`
        )).join('');

        const resolvedValue = options.some((option) => option.value === currentValue)
            ? currentValue
            : WHITE_CELL_ALL_TEAMS_RECIPIENT;

        recipientSelect.value = resolvedValue;
    }

    isLeadOperator() {
        return this.operatorRole !== WHITE_CELL_OPERATOR_ROLES.SUPPORT;
    }

    getTimelineActorRole() {
        return (
            sessionStore.getRole()
            || sessionStore.getSessionData()?.role
            || (this.isLeadOperator()
                ? this.teamContext.whitecellLeadRole
                : this.teamContext.whitecellSupportRole)
        );
    }

    bindEventListeners() {
        const startTimerBtn = document.getElementById('startTimerBtn');
        const pauseTimerBtn = document.getElementById('pauseTimerBtn');
        const resetTimerBtn = document.getElementById('resetTimerBtn');
        const prevPhaseBtn = document.getElementById('prevPhaseBtn');
        const nextPhaseBtn = document.getElementById('nextPhaseBtn');
        const prevMoveBtn = document.getElementById('prevMoveBtn');
        const nextMoveBtn = document.getElementById('nextMoveBtn');
        const commForm = document.getElementById('commForm');
        const participantsTeamFilter = document.getElementById('participantsTeamFilter');
        const participantsRoleFilter = document.getElementById('participantsRoleFilter');
        const timelineTeamFilter = document.getElementById('timelineTeamFilter');
        const timelineRoleFilter = document.getElementById('timelineRoleFilter');

        if (this.isLeadOperator()) {
            startTimerBtn?.addEventListener('click', () => this.startTimer());
            pauseTimerBtn?.addEventListener('click', () => this.pauseTimer());
            resetTimerBtn?.addEventListener('click', () => this.resetTimer());
            prevPhaseBtn?.addEventListener('click', () => this.regressPhase());
            nextPhaseBtn?.addEventListener('click', () => this.advancePhase());
            prevMoveBtn?.addEventListener('click', () => this.regressMove());
            nextMoveBtn?.addEventListener('click', () => this.advanceMove());
        } else {
            [
                startTimerBtn,
                pauseTimerBtn,
                resetTimerBtn,
                prevPhaseBtn,
                nextPhaseBtn,
                prevMoveBtn,
                nextMoveBtn
            ].forEach((button) => {
                if (!button) return;
                button.disabled = true;
                button.setAttribute?.('aria-disabled', 'true');
                button.title = 'White Cell support is read-only for game controls.';
            });
        }

        commForm?.addEventListener('submit', (event) => this.handleCommunicationSubmit(event));
        participantsTeamFilter?.addEventListener('change', (event) => {
            this.participantFilters.team = event.currentTarget.value || null;
            this.renderParticipants();
        });
        participantsRoleFilter?.addEventListener('change', (event) => {
            this.participantFilters.role = event.currentTarget.value || null;
            this.renderParticipants();
        });
        timelineTeamFilter?.addEventListener('change', (event) => {
            this.timelineFilters.team = event.currentTarget.value || null;
            this.renderTimeline();
        });
        timelineRoleFilter?.addEventListener('change', (event) => {
            this.timelineFilters.role = event.currentTarget.value || null;
            this.renderTimeline();
        });
    }

    subscribeToLiveData() {
        this.storeUnsubscribers.push(
            gameStateStore.subscribe((_event, state) => {
                this.syncGameStateFromStore(state);
            })
        );

        this.storeUnsubscribers.push(
            actionsStore.subscribe(() => {
                this.syncActionsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            requestsStore.subscribe(() => {
                this.syncRfisFromStore();
            })
        );

        this.storeUnsubscribers.push(
            communicationsStore.subscribe(() => {
                this.syncCommunicationsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            participantsStore.subscribe(() => {
                this.syncParticipantsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            timelineStore.subscribe(() => {
                this.syncTimelineFromStore();
            })
        );
    }

    getCurrentGameState() {
        return gameStateStore.getState() || sessionStore.getSessionData()?.gameState || {
            move: 1,
            phase: 1,
            timer_seconds: this.currentTimerSeconds,
            timer_running: this.timerRunning
        };
    }

    syncGameStateFromStore(gameState) {
        const safeGameState = gameState || {};
        this.currentTimerSeconds = gameState?.timer_seconds ?? CONFIG.DEFAULT_TIMER_SECONDS;
        this.timerRunning = Boolean(gameState?.timer_running && this.currentTimerSeconds > 0);
        this.updateGameStateDisplay({
            ...safeGameState,
            timer_seconds: this.currentTimerSeconds,
            timer_running: this.timerRunning
        });
        this.updateTimerDisplay();
        this.updateTimerStatusDisplay();
    }

    updateTimerDisplay() {
        const controlDisplay = document.getElementById('controlTimerDisplay');
        const headerDisplay = document.getElementById('timerDisplay');
        const minutes = Math.floor(this.currentTimerSeconds / 60);
        const seconds = this.currentTimerSeconds % 60;
        const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (controlDisplay) controlDisplay.textContent = formatted;
        if (headerDisplay) headerDisplay.textContent = formatted;
    }

    updateTimerStatusDisplay() {
        const statusText = this.timerRunning ? 'Running' : 'Paused';
        const statusEls = [
            document.getElementById('timerStatusLabel'),
            document.getElementById('timerStatus')
        ];

        statusEls.forEach((element) => {
            if (!element) return;
            element.textContent = statusText;
            element.classList.toggle('timer-running', this.timerRunning);
        });
    }

    updateGameStateDisplay(gameState = {}) {
        const move = gameState.move ?? 1;
        const phase = gameState.phase ?? 1;
        const moveLabel = ENUMS.MOVES[move] || `Move ${move}`;
        const phaseLabel = ENUMS.PHASES[phase] || `Phase ${phase}`;

        const currentMove = document.getElementById('currentMove');
        const currentPhase = document.getElementById('currentPhase');
        const currentMoveLabel = document.getElementById('moveLabel');
        const currentPhaseLabel = document.getElementById('phaseLabel');
        const headerMove = document.getElementById('headerMove');
        const headerPhase = document.getElementById('headerPhase');

        if (currentMove) currentMove.textContent = move;
        if (currentPhase) currentPhase.textContent = phase;
        if (currentMoveLabel) currentMoveLabel.textContent = moveLabel;
        if (currentPhaseLabel) currentPhaseLabel.textContent = phaseLabel;
        if (headerMove) headerMove.textContent = move;
        if (headerPhase) headerPhase.textContent = phase;

        this.updateGameControlAvailability(move, phase);
    }

    updateGameControlAvailability(move, phase) {
        const prevMoveBtn = document.getElementById('prevMoveBtn');
        const nextMoveBtn = document.getElementById('nextMoveBtn');
        const prevPhaseBtn = document.getElementById('prevPhaseBtn');
        const nextPhaseBtn = document.getElementById('nextPhaseBtn');

        if (!this.isLeadOperator()) {
            if (prevMoveBtn) prevMoveBtn.disabled = true;
            if (nextMoveBtn) nextMoveBtn.disabled = true;
            if (prevPhaseBtn) prevPhaseBtn.disabled = true;
            if (nextPhaseBtn) nextPhaseBtn.disabled = true;
            return;
        }

        if (prevMoveBtn) prevMoveBtn.disabled = move <= 1;
        if (nextMoveBtn) nextMoveBtn.disabled = move >= 3;
        if (prevPhaseBtn) prevPhaseBtn.disabled = phase <= 1;
        if (nextPhaseBtn) nextPhaseBtn.disabled = phase >= 5;
    }

    async startTimer() {
        if (this.timerRunning) return;

        await gameStateStore.startTimer();

        showToast({ message: 'Timer started', type: 'success' });
        logger.info('Timer started');
    }

    async pauseTimer({ silent = false } = {}) {
        await gameStateStore.pauseTimer();

        if (!silent) {
            showToast({ message: 'Timer paused', type: 'info' });
        }

        logger.info('Timer paused');
    }

    async resetTimer() {
        const confirmed = await confirmModal({
            title: 'Reset Timer',
            message: 'Are you sure you want to reset the timer to the default duration?',
            confirmLabel: 'Reset',
            variant: 'primary'
        });

        if (!confirmed) return;

        await gameStateStore.resetTimer(CONFIG.DEFAULT_TIMER_SECONDS);

        showToast({ message: 'Timer reset', type: 'success' });
    }

    async advancePhase() {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const currentState = this.getCurrentGameState();
        const currentPhase = currentState.phase ?? 1;
        const currentMove = currentState.move ?? 1;

        if (currentPhase >= 5) {
            showToast({ message: 'Already at the final phase for this move.', type: 'warning' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Advance Phase',
            message: `Advance from Phase ${currentPhase} to Phase ${currentPhase + 1}?`,
            confirmLabel: 'Advance',
            variant: 'primary'
        });

        if (!confirmed) return;

        const loader = showLoader({ message: 'Advancing phase...' });

        try {
            const updatedState = await gameStateStore.advancePhase();
            if (!updatedState) {
                throw new Error('Phase advance failed');
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'PHASE_CHANGE',
                content: `Phase advanced from ${currentPhase} to ${updatedState.phase}`,
                metadata: { role: this.getTimelineActorRole() },
                team: 'white_cell',
                move: currentMove,
                phase: updatedState.phase
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: `Advanced to Phase ${updatedState.phase}`, type: 'success' });
            logger.info(`Phase advanced to ${updatedState.phase}`);
        } catch (err) {
            logger.error('Failed to advance phase:', err);
            showToast({ message: 'Failed to advance phase', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async regressPhase() {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const currentState = this.getCurrentGameState();
        const currentPhase = currentState.phase ?? 1;
        const currentMove = currentState.move ?? 1;

        if (currentPhase <= 1) {
            showToast({ message: 'Already at the first phase.', type: 'warning' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Return to Previous Phase',
            message: `Move back from Phase ${currentPhase} to Phase ${currentPhase - 1}?`,
            confirmLabel: 'Return',
            variant: 'primary'
        });

        if (!confirmed) return;

        const loader = showLoader({ message: 'Returning to previous phase...' });

        try {
            const updatedState = await gameStateStore.regressPhase();
            if (!updatedState) {
                throw new Error('Phase regression failed');
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'PHASE_CHANGE',
                content: `Phase moved back from ${currentPhase} to ${updatedState.phase}`,
                metadata: { role: this.getTimelineActorRole() },
                team: 'white_cell',
                move: currentMove,
                phase: updatedState.phase
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: `Returned to Phase ${updatedState.phase}`, type: 'success' });
            logger.info(`Phase regressed to ${updatedState.phase}`);
        } catch (err) {
            logger.error('Failed to regress phase:', err);
            showToast({ message: 'Failed to return to previous phase', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async advanceMove() {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const currentState = this.getCurrentGameState();
        const currentMove = currentState.move ?? 1;

        if (currentMove >= 3) {
            showToast({ message: 'Already at the final move (Move 3).', type: 'warning' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Advance Move',
            message: `Advance from Move ${currentMove} to Move ${currentMove + 1}? This resets the phase to 1.`,
            confirmLabel: 'Advance',
            variant: 'primary'
        });

        if (!confirmed) return;

        const loader = showLoader({ message: 'Advancing move...' });

        try {
            const updatedState = await gameStateStore.advanceMove();
            if (!updatedState) {
                throw new Error('Move advance failed');
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'MOVE_CHANGE',
                content: `Move advanced from ${currentMove} to ${updatedState.move}`,
                metadata: { role: this.getTimelineActorRole() },
                team: 'white_cell',
                move: updatedState.move,
                phase: updatedState.phase
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: `Advanced to Move ${updatedState.move}`, type: 'success' });
            logger.info(`Move advanced to ${updatedState.move}`);
        } catch (err) {
            logger.error('Failed to advance move:', err);
            showToast({ message: 'Failed to advance move', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async regressMove() {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const currentState = this.getCurrentGameState();
        const currentMove = currentState.move ?? 1;

        if (currentMove <= 1) {
            showToast({ message: 'Already at the first move.', type: 'warning' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Return to Previous Move',
            message: `Move back from Move ${currentMove} to Move ${currentMove - 1}? This resets the phase to 1.`,
            confirmLabel: 'Return',
            variant: 'primary'
        });

        if (!confirmed) return;

        const loader = showLoader({ message: 'Returning to previous move...' });

        try {
            const updatedState = await gameStateStore.regressMove();
            if (!updatedState) {
                throw new Error('Move regression failed');
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'MOVE_CHANGE',
                content: `Move returned from ${currentMove} to ${updatedState.move}`,
                metadata: { role: this.getTimelineActorRole() },
                team: 'white_cell',
                move: updatedState.move,
                phase: updatedState.phase
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: `Returned to Move ${updatedState.move}`, type: 'success' });
            logger.info(`Move regressed to ${updatedState.move}`);
        } catch (err) {
            logger.error('Failed to regress move:', err);
            showToast({ message: 'Failed to return to previous move', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    syncActionsFromStore() {
        this.actions = actionsStore.getPending();

        this.renderActionReview();
        this.renderAdjudicationQueue();

        const badge = document.getElementById('actionsBadge');
        if (badge) {
            badge.textContent = this.getPendingActions().length;
        }
    }

    getPendingActions() {
        return this.actions.filter((action) => canAdjudicateAction(action));
    }

    renderActionReview() {
        const container = document.getElementById('actionsList');
        if (!container) return;

        if (this.actions.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No submitted actions are awaiting White Cell review.</p>';
            return;
        }

        container.innerHTML = this.actions.map((action) =>
            this.renderActionCard(action, {
                showAdjudicateAction: this.isLeadOperator() && canAdjudicateAction(action),
                includeOutcome: true
            })
        ).join('');

        this.bindAdjudicationButtons(container);
    }

    renderAdjudicationQueue() {
        const container = document.getElementById('adjudicationQueue');
        if (!container) return;

        const pendingActions = this.getPendingActions();

        if (pendingActions.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No actions are waiting for adjudication.</p>';
            return;
        }

        container.innerHTML = pendingActions.map((action) =>
            this.renderActionCard(action, {
                showAdjudicateAction: this.isLeadOperator(),
                includeOutcome: false
            })
        ).join('');

        this.bindAdjudicationButtons(container);
    }

    renderActionCard(action, { showAdjudicateAction = false, includeOutcome = false } = {}) {
        const status = action.status || ENUMS.ACTION_STATUS.DRAFT;
        const targets = Array.isArray(action.targets)
            ? action.targets
            : (action.target ? [action.target] : []);
        const expectedOutcomes = action.expected_outcomes || action.description || '';
        const targetLabel = targets.length ? targets.join(', ') : 'Not specified';
        const submittedMarkup = action.submitted_at
            ? `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                    <strong>Submitted:</strong> ${this.escapeHtml(formatDateTime(action.submitted_at))}
                </p>
            `
            : '';
        const outcomeMarkup = includeOutcome && action.outcome
            ? `<p class="text-xs text-gray-500" style="margin-top: var(--space-2);"><strong>Outcome:</strong> ${this.escapeHtml(action.outcome)}</p>`
            : '';
        const notesMarkup = includeOutcome && action.adjudication_notes
            ? `<p class="text-xs text-gray-500" style="margin-top: var(--space-2);"><strong>Notes:</strong> ${this.escapeHtml(action.adjudication_notes)}</p>`
            : '';
        const actionButtonMarkup = showAdjudicateAction
            ? `<button class="btn btn-primary btn-sm adjudicate-btn" data-action-id="${action.id}">Adjudicate</button>`
            : '';

        return `
            <div class="card card-bordered" data-action-id="${action.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="font-semibold">${this.escapeHtml(action.goal || action.title || 'Untitled action')}</h3>
                        <p class="text-xs text-gray-500">${this.escapeHtml(action.mechanism || 'No mechanism')} | ${this.escapeHtml(this.formatTeamLabel(action.team))} | Move ${action.move || 1} | Phase ${action.phase || 1}</p>
                    </div>
                    <div style="display: flex; gap: var(--space-2);">
                        ${createStatusBadge(status).outerHTML}
                        ${createPriorityBadge(action.priority || 'NORMAL').outerHTML}
                    </div>
                </div>
                <p class="text-sm mb-3">${this.escapeHtml(expectedOutcomes || 'No expected outcomes recorded.')}</p>
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
                ${submittedMarkup}
                ${outcomeMarkup}
                ${notesMarkup}
                ${actionButtonMarkup ? `
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${actionButtonMarkup}
                    </div>
                ` : ''}
            </div>
        `;
    }

    bindAdjudicationButtons(container) {
        if (!this.isLeadOperator()) {
            return;
        }

        container.querySelectorAll('.adjudicate-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const actionId = button.dataset.actionId;
                const action = this.actions.find((candidate) => candidate.id === actionId);
                if (action) {
                    this.showAdjudicateModal(action);
                }
            });
        });
    }

    showAdjudicateModal(action) {
        if (!this.isLeadOperator()) {
            showToast({ message: 'White Cell support cannot adjudicate actions.', type: 'warning' });
            return;
        }

        const outcomeOptions = ENUMS.OUTCOMES
            .map((value) => `<option value="${value}">${value}</option>`)
            .join('');

        const content = document.createElement('div');
        content.innerHTML = `
            <div class="mb-4">
                <h4 class="font-semibold">${this.escapeHtml(action.goal || action.title || 'Untitled action')}</h4>
                <p class="text-sm text-gray-500">${this.escapeHtml(action.mechanism || 'No mechanism')} | ${this.escapeHtml(this.formatTeamLabel(action.team))} | Move ${action.move || 1} | Phase ${action.phase || 1}</p>
                <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                    <strong>Targets:</strong> ${this.escapeHtml((Array.isArray(action.targets) ? action.targets : (action.target ? [action.target] : [])).join(', ') || 'Not specified')} |
                    <strong>Sector:</strong> ${this.escapeHtml(action.sector || 'Not specified')} |
                    <strong>Exposure:</strong> ${this.escapeHtml(action.exposure_type || 'Not specified')}
                </p>
                ${action.submitted_at ? `
                    <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                        <strong>Submitted:</strong> ${this.escapeHtml(formatDateTime(action.submitted_at))}
                    </p>
                ` : ''}
                ${action.ally_contingencies ? `
                    <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                        <strong>Ally Contingencies:</strong> ${this.escapeHtml(action.ally_contingencies)}
                    </p>
                ` : ''}
                <p class="text-sm mt-2">${this.escapeHtml(action.expected_outcomes || action.description || '')}</p>
            </div>

            <form id="adjudicateForm">
                <div class="form-group">
                    <label class="form-label" for="outcomeSelect">Outcome *</label>
                    <select id="outcomeSelect" class="form-select" required>
                        <option value="">Select outcome</option>
                        ${outcomeOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label" for="adjudicationNotes">Notes</label>
                    <textarea id="adjudicationNotes" class="form-input form-textarea" rows="4" placeholder="Explain the outcome..."></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };
        modalRef.current = showModal({
            title: 'Adjudicate Action',
            content,
            size: 'md',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Submit Adjudication',
                    variant: 'primary',
                    onClick: () => {
                        this.handleAdjudicate(modalRef.current, action.id).catch((err) => {
                            logger.error('Failed to submit adjudication:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    async handleAdjudicate(modal, actionId) {
        const outcome = document.getElementById('outcomeSelect')?.value;
        const notes = document.getElementById('adjudicationNotes')?.value?.trim();

        if (!outcome) {
            showToast({ message: 'Please select an outcome', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Submitting adjudication...' });

        try {
            const updatedAction = await database.adjudicateAction(actionId, {
                outcome,
                adjudication_notes: notes || null,
                adjudicated_at: new Date().toISOString()
            });
            actionsStore.updateFromServer('UPDATE', updatedAction);

            const gameState = this.getCurrentGameState();
            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionStore.getSessionId(),
                type: 'ACTION_ADJUDICATED',
                content: `Action adjudicated: ${outcome}`,
                metadata: {
                    related_id: actionId,
                    role: this.getTimelineActorRole()
                },
                team: 'white_cell',
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Adjudication submitted', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to adjudicate action:', err);
            showToast({ message: 'Failed to submit adjudication', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    syncRfisFromStore() {
        this.rfis = requestsStore.getPending();

        this.renderRfiQueue();

        const badge = document.getElementById('rfiBadge');
        if (badge) {
            badge.textContent = this.rfis.length;
        }
    }

    renderRfiQueue() {
        const container = document.getElementById('rfiQueue');
        if (!container) return;

        if (this.rfis.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No pending RFIs.</p>';
            return;
        }

        container.innerHTML = this.rfis.map((rfi) => {
            const queryText = rfi.query || rfi.question || '';
            return `
                <div class="card card-bordered" data-rfi-id="${rfi.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2); gap: var(--space-2);">
                        <span class="text-xs text-gray-500">${this.escapeHtml(this.formatTeamLabel(rfi.team))} | ${formatRelativeTime(rfi.created_at)}</span>
                        <div style="display: flex; gap: var(--space-2);">
                            ${createStatusBadge('pending').outerHTML}
                            ${createPriorityBadge(rfi.priority || 'NORMAL').outerHTML}
                        </div>
                    </div>
                    <p class="text-sm font-medium mb-2">${this.escapeHtml(queryText)}</p>
                    ${Array.isArray(rfi.categories) && rfi.categories.length ? `
                        <p class="text-xs text-gray-500"><strong>Categories:</strong> ${this.escapeHtml(rfi.categories.join(', '))}</p>
                    ` : ''}
                    <div class="card-actions" style="margin-top: var(--space-3);">
                        <button class="btn btn-primary btn-sm respond-rfi-btn" data-rfi-id="${rfi.id}">Respond</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.respond-rfi-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const rfiId = button.dataset.rfiId;
                const rfi = this.rfis.find((candidate) => candidate.id === rfiId);
                if (rfi) {
                    this.showRespondRfiModal(rfi);
                }
            });
        });
    }

    showRespondRfiModal(rfi) {
        const content = document.createElement('div');
        const queryText = rfi.query || rfi.question || '';

        content.innerHTML = `
            <div class="mb-4 p-3 bg-gray-50 rounded">
                <p class="text-sm font-medium">Question</p>
                <p class="text-sm">${this.escapeHtml(queryText)}</p>
            </div>

            <form id="rfiResponseForm">
                <div class="form-group">
                    <label class="form-label" for="rfiResponse">Response *</label>
                    <textarea id="rfiResponse" class="form-input form-textarea" rows="4" placeholder="Enter your response..." required></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };
        modalRef.current = showModal({
            title: 'Respond to RFI',
            content,
            size: 'md',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Send Response',
                    variant: 'primary',
                    onClick: () => {
                        this.handleRfiResponse(modalRef.current, rfi.id).catch((err) => {
                            logger.error('Failed to send RFI response:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    async handleRfiResponse(modal, rfiId) {
        const response = document.getElementById('rfiResponse')?.value?.trim();
        if (!response) {
            showToast({ message: 'Please enter a response', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Sending response...' });

        try {
            const updatedRequest = await database.updateRequest(rfiId, {
                response,
                status: 'answered',
                responded_at: new Date().toISOString()
            });
            requestsStore.updateFromServer('UPDATE', updatedRequest);

            const gameState = this.getCurrentGameState();
            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionStore.getSessionId(),
                type: 'RFI_ANSWERED',
                content: 'White Cell responded to an RFI.',
                metadata: {
                    related_id: rfiId,
                    role: this.getTimelineActorRole()
                },
                team: 'white_cell',
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Response sent', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to respond to RFI:', err);
            showToast({ message: 'Failed to send response', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async handleCommunicationSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const recipient = document.getElementById('commRecipient')?.value;
        const type = document.getElementById('commType')?.value || 'INJECT';
        const content = document.getElementById('commContent')?.value?.trim();

        if (!recipient || !content) {
            showToast({ message: 'Please fill in all required fields', type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const loader = showLoader({ message: 'Sending communication...' });

        try {
            const gameState = this.getCurrentGameState();
            const communication = await database.createCommunication({
                session_id: sessionId,
                from_role: 'white_cell',
                to_role: recipient,
                type,
                content,
                metadata: {}
            });
            communicationsStore.updateFromServer('INSERT', communication);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type,
                content: `White Cell ${type.toLowerCase()} sent to ${this.formatCommunicationRecipient(recipient)}`,
                metadata: { role: this.getTimelineActorRole() },
                team: 'white_cell',
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            form.reset();
            document.getElementById('commRecipient').value = WHITE_CELL_ALL_TEAMS_RECIPIENT;
            document.getElementById('commType').value = 'INJECT';

            showToast({ message: 'Communication sent', type: 'success' });
        } catch (err) {
            logger.error('Failed to send communication:', err);
            showToast({ message: 'Failed to send communication', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    syncCommunicationsFromStore() {
        this.communications = communicationsStore.getAll();
        this.renderCommunicationHistory();
    }

    syncParticipantsFromStore() {
        this.participants = buildWhiteCellParticipantRoster(participantsStore.getAll());
        this.configureParticipantFilters();
        this.renderParticipants();
    }

    configureParticipantFilters() {
        const teamSelect = document.getElementById('participantsTeamFilter');
        const roleSelect = document.getElementById('participantsRoleFilter');
        if (!teamSelect || !roleSelect) return;

        const { teamOptions, roleOptions } = buildWhiteCellParticipantFilterOptions(this.participants);
        this.populateFilterSelect(teamSelect, teamOptions, this.participantFilters.team);
        this.populateFilterSelect(roleSelect, roleOptions, this.participantFilters.role);
        this.participantFilters.team = teamSelect.value || null;
        this.participantFilters.role = roleSelect.value || null;
    }

    renderParticipants() {
        const summary = document.getElementById('participantsSummary');
        const container = document.getElementById('participantsList');
        if (!summary || !container) return;

        const filteredParticipants = filterWhiteCellParticipants(this.participants, this.participantFilters);
        const hasActiveFilters = Boolean(this.participantFilters.team || this.participantFilters.role);
        const filteredSummary = filteredParticipants.length === 0 && this.participants.length > 0 && hasActiveFilters
            ? 'No participants match the current filters.'
            : formatWhiteCellParticipantSummary(filteredParticipants);

        summary.textContent = filteredSummary;

        if (filteredParticipants.length === 0) {
            container.innerHTML = hasActiveFilters
                ? '<p class="text-sm text-gray-500">No participants match the selected team and role filters.</p>'
                : '<p class="text-sm text-gray-500">No facilitator, notetaker, observer, or White Cell seats are connected in this session yet.</p>';
            return;
        }

        container.innerHTML = filteredParticipants.map((participant) => {
            const connectionBadge = createBadge({
                text: isConnectedParticipant(participant) ? 'Connected' : 'Inactive',
                variant: isConnectedParticipant(participant) ? 'success' : 'default',
                size: 'sm',
                rounded: true
            }).outerHTML;
            const roleBadge = createRoleBadge(participant.role || 'unknown').outerHTML;
            const roleLabel = getRoleDisplayName(participant.role) || participant.role || 'Unknown role';
            const lastActiveAt = participant.heartbeat_at || participant.last_seen || participant.joined_at;

            return `
                <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-sm font-semibold">${this.escapeHtml(participant.display_name || 'Unknown')}</p>
                            <p class="text-xs text-gray-500">${this.escapeHtml(roleLabel)}</p>
                        </div>
                        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                            ${connectionBadge}
                            ${roleBadge}
                        </div>
                    </div>
                    <p class="text-xs text-gray-500">
                        ${lastActiveAt ? `Last active ${formatRelativeTime(lastActiveAt)}` : 'Joined this session recently'}
                    </p>
                </div>
            `;
        }).join('');
    }

    renderCommunicationHistory() {
        const container = document.getElementById('commHistory');
        if (!container) return;

        if (this.communications.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No communications sent yet.</p>';
            return;
        }

        container.innerHTML = this.communications.map((communication) => `
            <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                    <div>
                        <p class="text-sm font-semibold">${this.escapeHtml(this.formatCommunicationRecipient(communication.to_role))}</p>
                        <p class="text-xs text-gray-500">${formatRelativeTime(communication.created_at)}</p>
                    </div>
                    ${createBadge({ text: communication.type || 'MESSAGE', size: 'sm' }).outerHTML}
                </div>
                <p class="text-sm">${this.escapeHtml(communication.content || '')}</p>
            </div>
        `).join('');
    }

    formatCommunicationRecipient(recipient) {
        if (recipient === WHITE_CELL_ALL_TEAMS_RECIPIENT) {
            return 'All Teams';
        }

        if (TEAM_LABELS[recipient]) {
            return getWhiteCellTeamLabel(recipient);
        }

        return getRoleDisplayName(recipient) || recipient || 'Unknown recipient';
    }

    syncTimelineFromStore() {
        this.timelineEvents = timelineStore.getAll();
        this.configureTimelineFilters();
        this.renderTimeline();
    }

    configureTimelineFilters() {
        const teamSelect = document.getElementById('timelineTeamFilter');
        const roleSelect = document.getElementById('timelineRoleFilter');
        if (!teamSelect || !roleSelect) return;

        const { teamOptions, roleOptions } = buildWhiteCellTimelineFilterOptions(this.timelineEvents);
        this.populateFilterSelect(teamSelect, teamOptions, this.timelineFilters.team);
        this.populateFilterSelect(roleSelect, roleOptions, this.timelineFilters.role);
        this.timelineFilters.team = teamSelect.value || null;
        this.timelineFilters.role = roleSelect.value || null;
    }

    populateFilterSelect(selectElement, options, currentValue) {
        if (!selectElement) {
            return;
        }

        const normalizedValue = currentValue || '';
        selectElement.innerHTML = options.map((option) => (
            `<option value="${option.value}">${this.escapeHtml(option.label)}</option>`
        )).join('');

        selectElement.value = options.some((option) => option.value === normalizedValue)
            ? normalizedValue
            : '';
    }

    renderTimeline() {
        const container = document.getElementById('timelineList');
        if (!container) return;

        const filteredEvents = filterWhiteCellTimelineEvents(this.timelineEvents, this.timelineFilters);
        const hasActiveFilters = Boolean(this.timelineFilters.team || this.timelineFilters.role);

        if (filteredEvents.length === 0) {
            container.innerHTML = hasActiveFilters
                ? '<p class="text-sm text-gray-500">No timeline events match the selected team and role filters.</p>'
                : '<p class="text-sm text-gray-500">No events yet.</p>';
            return;
        }

        container.innerHTML = filteredEvents.slice(0, 50).map((event) => {
            const eventType = event.type || event.event_type || 'EVENT';
            const eventContent = event.content || event.description || '';

            return `
                <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                            ${createBadge({ text: eventType, size: 'sm' }).outerHTML}
                            <span class="text-xs text-gray-400">${formatDateTime(event.created_at)}</span>
                        </div>
                        <p class="text-sm mt-1">${this.escapeHtml(eventContent)}</p>
                        <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(event.team))} | Move ${event.move || 1}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTeamLabel(team) {
        return getWhiteCellTeamLabel(team);
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

const whiteCellController = new WhiteCellController();

const shouldAutoInitWhiteCell = typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    !globalThis.__ESG_DISABLE_AUTO_INIT__;

if (shouldAutoInitWhiteCell) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => whiteCellController.init());
    } else {
        whiteCellController.init();
    }

    window.addEventListener('beforeunload', () => whiteCellController.destroy());
}

export default whiteCellController;
