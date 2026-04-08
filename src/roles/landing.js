/**
 * Landing Page Controller
 * ESG Economic Statecraft Simulation Platform v2.0
 *
 * Handles session joining and role selection on the landing page.
 */

import { sessionStore } from '../stores/session.js';
import { database } from '../services/database.js';
import { ensureBrowserIdentity, getRuntimeConfigStatus } from '../services/supabase.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader } from '../components/ui/Loader.js';
import { validateSessionCode } from '../utils/validation.js';
import { navigateToApp } from '../core/navigation.js';
import {
    OPERATOR_SURFACES,
    TEAM_OPTIONS,
    WHITE_CELL_OPERATOR_ROLES,
    isPublicRoleSurface,
    ROLE_SURFACES,
    buildTeamRole,
    buildWhiteCellOperatorRole,
    getRoleDisplayName,
    getRoleRoute,
    parseTeamRole
} from '../core/teamContext.js';

const logger = createLogger('Landing');

/**
 * Landing Page Controller Class
 */
export class LandingController {
    constructor() {
        this.selectedTeam = TEAM_OPTIONS[0].id;
        this.selectedRoleSurface = null;
        this.selectedRole = null;
    }

    /**
     * Initialize the landing page
     */
    init() {
        logger.info('Initializing landing page');

        if (!getRuntimeConfigStatus().ready) {
            logger.error('Landing page blocked: backend configuration is missing');
            return;
        }

        // Check if already in a session
        const existingSession = sessionStore.getSessionId();
        if (existingSession) {
            this.showResumeOption(existingSession);
        }

        this.bindEventListeners();
        this.selectDefaultTeam();
        void this.prewarmBrowserIdentity();
        logger.info('Landing page initialized');
    }

    /**
     * Bind event listeners
     */
    bindEventListeners() {
        // Join session form
        const joinForm = document.getElementById('joinForm');
        if (joinForm) {
            joinForm.addEventListener('submit', (e) => this.handleJoinSession(e));
        }

        // Role selection buttons
        const teamButtons = document.querySelectorAll('.team-option');
        teamButtons.forEach((button) => {
            button.addEventListener('click', () => this.selectTeam(button));
        });

        const roleButtons = document.querySelectorAll('.role-option');
        roleButtons.forEach((button) => {
            button.addEventListener('click', () => this.selectRole(button));
        });

        const gameMasterAccessBtn = document.getElementById('operatorGameMasterBtn');
        gameMasterAccessBtn?.addEventListener('click', () => {
            void this.handleOperatorAccess(OPERATOR_SURFACES.GAME_MASTER);
        });

        const whiteCellLeadAccessBtn = document.getElementById('operatorWhiteCellLeadBtn');
        whiteCellLeadAccessBtn?.addEventListener('click', () => {
            void this.handleOperatorAccess(OPERATOR_SURFACES.WHITE_CELL, {
                operatorRole: WHITE_CELL_OPERATOR_ROLES.LEAD
            });
        });

        const whiteCellSupportAccessBtn = document.getElementById('operatorWhiteCellSupportBtn');
        whiteCellSupportAccessBtn?.addEventListener('click', () => {
            void this.handleOperatorAccess(OPERATOR_SURFACES.WHITE_CELL, {
                operatorRole: WHITE_CELL_OPERATOR_ROLES.SUPPORT
            });
        });

        const legacyWhiteCellAccessBtn = document.getElementById('operatorWhiteCellBtn');
        legacyWhiteCellAccessBtn?.addEventListener('click', () => {
            void this.handleOperatorAccess(OPERATOR_SURFACES.WHITE_CELL, {
                operatorRole: WHITE_CELL_OPERATOR_ROLES.LEAD
            });
        });

        // Leave session button (if shown)
        const leaveBtn = document.getElementById('leaveSessionBtn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this.leaveSession());
        }
    }

    selectDefaultTeam() {
        const defaultTeamButton = document.querySelector(`.team-option[data-team="${this.selectedTeam}"]`);
        if (defaultTeamButton) {
            this.selectTeam(defaultTeamButton);
        }
    }

    selectTeam(button) {
        document.querySelectorAll('.team-option').forEach((candidate) => {
            candidate.classList.remove('selected');
            candidate.setAttribute('aria-pressed', 'false');
        });

        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');

        this.selectedTeam = button.dataset.team || TEAM_OPTIONS[0].id;

        const teamInput = document.getElementById('selectedTeam');
        if (teamInput) {
            teamInput.value = this.selectedTeam;
        }

        this.updateSelectedRole();
        logger.debug('Team selected:', this.selectedTeam);
    }

    /**
     * Show resume session option
     * @param {string} sessionId - Existing session ID
     */
    showResumeOption(sessionId) {
        const resumeSection = document.getElementById('resumeSection');
        if (!resumeSection) return;

        const sessionData = sessionStore.getSessionData();

        resumeSection.innerHTML = `
            <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-6); background: var(--color-primary-50);">
                <h3 class="font-semibold mb-2">Active Session Detected</h3>
                <p class="text-sm text-gray-600 mb-3">
                    You have an active session: <strong>${sessionData?.name || sessionId.slice(0, 8) + '...'}</strong>
                </p>
                <div style="display: flex; gap: var(--space-2);">
                    <button class="btn btn-primary btn-sm" id="resumeSessionBtn">Resume Session</button>
                    <button class="btn btn-ghost btn-sm" id="leaveSessionBtn">Leave Session</button>
                </div>
            </div>
        `;

        resumeSection.style.display = 'block';

        // Bind resume button
        const resumeBtn = document.getElementById('resumeSessionBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeSession());
        }

        // Rebind leave button
        const leaveBtn = document.getElementById('leaveSessionBtn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this.leaveSession());
        }
    }

    /**
     * Select a role
     * @param {HTMLElement} button - Role button element
     */
    selectRole(button) {
        const requestedSurface = button.dataset.roleSurface || null;
        if (!isPublicRoleSurface(requestedSurface)) {
            showToast({
                message: 'White Cell and Game Master require operator authorization.',
                type: 'error'
            });
            return;
        }

        // Deselect all
        document.querySelectorAll('.role-option').forEach(btn => {
            btn.classList.remove('selected');
            btn.setAttribute('aria-pressed', 'false');
        });

        // Select this one
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        this.selectedRoleSurface = requestedSurface;
        this.updateSelectedRole();

        logger.debug('Role selected:', this.selectedRole);
    }

    updateSelectedRole() {
        if (!this.selectedRoleSurface) {
            this.selectedRole = null;
        } else if (this.selectedRoleSurface === ROLE_SURFACES.VIEWER) {
            this.selectedRole = 'viewer';
        } else {
            this.selectedRole = buildTeamRole(this.selectedTeam, this.selectedRoleSurface);
        }

        const roleInput = document.getElementById('selectedRole');
        if (roleInput) {
            roleInput.value = this.selectedRole || '';
        }
    }

    async prewarmBrowserIdentity({ interactive = false } = {}) {
        try {
            await ensureBrowserIdentity({
                clientId: sessionStore.getClientId()
            });
        } catch (error) {
            logger.warn('Browser identity bootstrap failed:', error);
            if (interactive) {
                throw error;
            }
        }
    }

    /**
     * Handle join session form submission
     * @param {Event} e - Submit event
     */
    async handleJoinSession(e) {
        e.preventDefault();

        const codeInput = document.getElementById('sessionCode');
        const nameInput = document.getElementById('displayName');

        const sessionCode = codeInput?.value?.trim().toUpperCase();
        const displayName = nameInput?.value?.trim();

        // Validate session code
        const codeError = validateSessionCode(sessionCode);
        if (codeError) {
            showToast({ message: codeError, type: 'error' });
            codeInput?.focus();
            return;
        }

        // Validate display name (simple check since validateRequired throws)
        if (!displayName) {
            showToast({ message: 'Display name is required', type: 'error' });
            nameInput?.focus();
            return;
        }

        if (!this.selectedRole) {
            showToast({ message: 'Please select a role', type: 'error' });
            return;
        }

        if (!isPublicRoleSurface(this.selectedRoleSurface)) {
            showToast({
                message: 'White Cell and Game Master use the operator access flow.',
                type: 'error'
            });
            return;
        }

        const loader = showLoader({ message: 'Joining session...' });

        try {
            await this.prewarmBrowserIdentity({ interactive: true });
            const session = await this.findSessionByCode(sessionCode);
            const sessionCodeFromLookup = session.session_code || sessionCode;

            // Check role availability
            const parsedRole = parseTeamRole(this.selectedRole);
            const participantTeam = parsedRole.teamId || this.selectedTeam;
            const participant = await database.claimParticipantSeat(session.id, this.selectedRole, displayName);

            // Store session data
            sessionStore.clearOperatorAuth();
            sessionStore.setSessionId(session.id);
            sessionStore.setRole(this.selectedRole);
            sessionStore.setUserName(displayName);
            sessionStore.setSessionData({
                id: session.id,
                name: session.name,
                code: sessionCodeFromLookup,
                participantId: participant.id,
                participantSessionId: participant.id,
                role: this.selectedRole,
                displayName,
                team: participantTeam,
                roleSurface: this.selectedRoleSurface,
                seatClaimStatus: participant.claim_status || 'claimed'
            });

            // Load game state
            try {
                const gameState = await database.getGameState(session.id);
                if (gameState) {
                    sessionStore.setGameState(gameState);
                }
            } catch (e) {
                // Game state might not exist yet for new sessions
            }

            showToast({ message: 'Joined session successfully!', type: 'success' });
            logger.info('Joined session:', session.id, 'as', this.selectedRole);

            // Redirect to appropriate role page
            this.redirectToRole(this.selectedRole);

        } catch (err) {
            logger.error('Failed to join session:', err);
            showToast({ message: err.message || 'Failed to join session', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async handleOperatorAccess(surface, { operatorRole = WHITE_CELL_OPERATOR_ROLES.LEAD } = {}) {
        const operatorCodeInput = document.getElementById('operatorAccessCode');
        const operatorCode = operatorCodeInput?.value?.trim();

        if (!this.validateOperatorAccessCode(operatorCode)) {
            showToast({
                message: 'A valid operator access code is required.',
                type: 'error'
            });
            operatorCodeInput?.focus();
            return;
        }

        const loader = showLoader({
            message: surface === OPERATOR_SURFACES.GAME_MASTER
                ? 'Authorizing Game Master...'
                : 'Authorizing White Cell...'
        });

        try {
            if (surface === OPERATOR_SURFACES.GAME_MASTER) {
                await this.authorizeGameMaster(operatorCode);
                return;
            }

            await this.authorizeWhiteCell(operatorRole, operatorCode);
        } catch (err) {
            logger.error('Failed to authorize operator access:', err);
            showToast({
                message: err.message || 'Failed to authorize operator access',
                type: 'error'
            });
        } finally {
            hideLoader();
        }
    }

    validateOperatorAccessCode(operatorCode) {
        return Boolean(operatorCode?.trim());
    }

    async findSessionByCode(sessionCode) {
        // Operator note: public participants must resolve session codes through the
        // authenticated server-side RPC. Do not reintroduce browser-side session listing.
        return database.lookupJoinableSessionByCode(sessionCode);
    }

    async authorizeGameMaster(operatorCode) {
        const operatorName = document.getElementById('displayName')?.value?.trim() || 'Game Master Operator';
        const grant = await database.authorizeOperatorAccess({
            surface: OPERATOR_SURFACES.GAME_MASTER,
            accessCode: operatorCode,
            operatorName
        });

        sessionStore.clear();
        sessionStore.setRole('white');
        sessionStore.setUserName(operatorName);
        sessionStore.setOperatorAuth(grant);

        showToast({ message: 'Operator access granted.', type: 'success' });
        navigateToApp('master.html');
    }

    async authorizeWhiteCell(operatorRole = WHITE_CELL_OPERATOR_ROLES.LEAD, operatorCode) {
        const codeInput = document.getElementById('sessionCode');
        const sessionCode = codeInput?.value?.trim().toUpperCase();
        const operatorName = document.getElementById('displayName')?.value?.trim()
            || getRoleDisplayName(buildWhiteCellOperatorRole(this.selectedTeam, operatorRole));

        const codeError = validateSessionCode(sessionCode);
        if (codeError) {
            showToast({ message: codeError, type: 'error' });
            codeInput?.focus();
            return;
        }

        await this.prewarmBrowserIdentity({ interactive: true });
        const session = await this.findSessionByCode(sessionCode);
        const sessionCodeFromLookup = session.session_code || sessionCode;
        const whiteCellRole = buildWhiteCellOperatorRole(this.selectedTeam, operatorRole);
        const grant = await database.authorizeOperatorAccess({
            surface: OPERATOR_SURFACES.WHITE_CELL,
            accessCode: operatorCode,
            sessionId: session.id,
            teamId: this.selectedTeam,
            role: whiteCellRole,
            operatorName
        });
        const participant = await database.claimParticipantSeat(session.id, whiteCellRole, operatorName);

        sessionStore.clear();
        sessionStore.setSessionId(session.id);
        sessionStore.setRole(whiteCellRole);
        sessionStore.setUserName(operatorName);
        sessionStore.setSessionData({
            id: session.id,
            name: session.name,
            code: sessionCodeFromLookup,
            participantId: participant.id,
            participantSessionId: participant.id,
            role: whiteCellRole,
            displayName: operatorName,
            team: this.selectedTeam,
            roleSurface: ROLE_SURFACES.WHITECELL,
            operatorMode: true,
            seatClaimStatus: participant.claim_status || 'claimed'
        });
        sessionStore.setOperatorAuth({
            ...grant,
            sessionId: grant?.sessionId || session.id,
            sessionCode: sessionCodeFromLookup,
            teamId: grant?.teamId || this.selectedTeam,
            role: grant?.role || whiteCellRole,
            operatorName: grant?.operatorName || operatorName
        });

        try {
            const gameState = await database.getGameState(session.id);
            if (gameState) {
                sessionStore.setGameState(gameState);
            }
        } catch (error) {
            logger.warn('Failed to preload White Cell game state:', error);
        }

        showToast({ message: 'Operator access granted.', type: 'success' });
        this.redirectToRole(whiteCellRole);
    }

    /**
     * Resume existing session
     */
    resumeSession() {
        const sessionData = sessionStore.getSessionData();
        if (!sessionData?.role) {
            showToast({ message: 'Could not determine role. Please rejoin.', type: 'error' });
            this.leaveSession();
            return;
        }

        this.redirectToRole(sessionData.role);
    }

    /**
     * Leave current session
     */
    async leaveSession() {
        const participantId = sessionStore.getSessionParticipantId?.() || sessionStore.getSessionData()?.participantId;

        // Mark participant as inactive
        if (participantId) {
            try {
                const sessionId = sessionStore.getSessionId();
                if (sessionId) {
                    await database.disconnectParticipant(sessionId, participantId);
                }
            } catch (err) {
                logger.error('Failed to mark participant inactive:', err);
            }
        }

        sessionStore.clear();

        // Hide resume section
        const resumeSection = document.getElementById('resumeSection');
        if (resumeSection) {
            resumeSection.style.display = 'none';
        }

        showToast({ message: 'Left session', type: 'info' });
    }

    /**
     * Redirect to role-specific page
     * @param {string} role - Role identifier
     */
    redirectToRole(role) {
        const observerTeamId = sessionStore.getSessionData()?.team || this.selectedTeam;
        const route = getRoleRoute(role, { observerTeamId });
        if (route) {
            window.location.assign(route);
        } else {
            showToast({ message: 'Unknown role', type: 'error' });
        }
    }
}

// Initialize
export const landingController = new LandingController();

if (!globalThis.__ESG_DISABLE_AUTO_INIT__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => landingController.init());
    } else {
        landingController.init();
    }
}

export default landingController;
