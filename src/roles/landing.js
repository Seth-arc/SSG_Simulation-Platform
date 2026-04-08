/**
 * Landing Page Controller
 * ESG Economic Statecraft Simulation Platform v2.0
 *
 * Handles session joining and role selection on the landing page.
 */

import { sessionStore } from '../stores/session.js';
import { database } from '../services/database.js';
import { getRuntimeConfigStatus } from '../services/supabase.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader } from '../components/ui/Loader.js';
import { validateSessionCode } from '../utils/validation.js';
import { CONFIG } from '../core/config.js';
import { navigateToApp } from '../core/navigation.js';
import {
    OPERATOR_SURFACES,
    TEAM_OPTIONS,
    isPublicRoleSurface,
    ROLE_SURFACES,
    buildTeamRole,
    getRoleDisplayName,
    getRoleRoute,
    parseTeamRole
} from '../core/teamContext.js';

const logger = createLogger('Landing');

/**
 * Landing Page Controller Class
 */
class LandingController {
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

        const whiteCellAccessBtn = document.getElementById('operatorWhiteCellBtn');
        whiteCellAccessBtn?.addEventListener('click', () => {
            void this.handleOperatorAccess(OPERATOR_SURFACES.WHITE_CELL);
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
            const session = await this.findSessionByCode(sessionCode);
            const sessionCodeFromMetadata = session.metadata?.session_code;

            // Check role availability
            const participants = await database.getActiveParticipants(session.id);
            const parsedRole = parseTeamRole(this.selectedRole);
            const participantTeam = parsedRole.teamId || this.selectedTeam;

            const roleCount = (participants || []).filter(p => p.role === this.selectedRole && p.is_active).length;
            const roleLimit = CONFIG.ROLE_LIMITS[this.selectedRole] || 999;

            if (roleCount >= roleLimit) {
                throw new Error(`The ${getRoleDisplayName(this.selectedRole, { observerTeamId: participantTeam })} role is full. Please choose another role.`);
            }

            // Create participant record
            const participant = await database.registerParticipant(session.id, this.selectedRole, displayName);

            // Store session data
            sessionStore.clearOperatorAuth();
            sessionStore.setSessionId(session.id);
            sessionStore.setRole(this.selectedRole);
            sessionStore.setUserName(displayName);
            sessionStore.setSessionData({
                id: session.id,
                name: session.name,
                code: sessionCodeFromMetadata,
                participantId: participant.id,
                role: this.selectedRole,
                displayName,
                team: participantTeam,
                roleSurface: this.selectedRoleSurface
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

    async handleOperatorAccess(surface) {
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
                this.authorizeGameMaster();
                return;
            }

            await this.authorizeWhiteCell();
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
        return Boolean(
            operatorCode &&
            operatorCode === CONFIG.OPERATOR_ACCESS_CODE
        );
    }

    async findSessionByCode(sessionCode) {
        // Prompt 3 replaces this temporary browser-side lookup with a server-side join path.
        const allSessions = await database.getActiveSessions();
        const session = (allSessions || []).find((candidate) => {
            const code = candidate.metadata?.session_code;
            return code && code.toUpperCase() === sessionCode;
        });

        if (!session) {
            throw new Error('Session not found. Please check the code and try again.');
        }

        return session;
    }

    authorizeGameMaster() {
        const operatorName = document.getElementById('displayName')?.value?.trim() || 'Game Master Operator';

        sessionStore.clear();
        sessionStore.setRole('white');
        sessionStore.setUserName(operatorName);
        sessionStore.setOperatorAuth({
            surface: OPERATOR_SURFACES.GAME_MASTER,
            role: 'white',
            operatorName
        });

        showToast({ message: 'Operator access granted.', type: 'success' });
        navigateToApp('master.html');
    }

    async authorizeWhiteCell() {
        const codeInput = document.getElementById('sessionCode');
        const sessionCode = codeInput?.value?.trim().toUpperCase();
        const operatorName = document.getElementById('displayName')?.value?.trim()
            || `${getRoleDisplayName(buildTeamRole(this.selectedTeam, ROLE_SURFACES.WHITECELL))} Operator`;

        const codeError = validateSessionCode(sessionCode);
        if (codeError) {
            showToast({ message: codeError, type: 'error' });
            codeInput?.focus();
            return;
        }

        const session = await this.findSessionByCode(sessionCode);
        const sessionCodeFromMetadata = session.metadata?.session_code || sessionCode;
        const whiteCellRole = buildTeamRole(this.selectedTeam, ROLE_SURFACES.WHITECELL);

        sessionStore.clear();
        sessionStore.setSessionId(session.id);
        sessionStore.setRole(whiteCellRole);
        sessionStore.setUserName(operatorName);
        sessionStore.setSessionData({
            id: session.id,
            name: session.name,
            code: sessionCodeFromMetadata,
            participantId: null,
            role: whiteCellRole,
            displayName: operatorName,
            team: this.selectedTeam,
            roleSurface: ROLE_SURFACES.WHITECELL,
            operatorMode: true
        });
        sessionStore.setOperatorAuth({
            surface: OPERATOR_SURFACES.WHITE_CELL,
            sessionId: session.id,
            sessionCode: sessionCodeFromMetadata,
            teamId: this.selectedTeam,
            role: whiteCellRole,
            operatorName
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
        const participantId = sessionStore.getSessionData()?.participantId;

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
const landingController = new LandingController();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => landingController.init());
} else {
    landingController.init();
}

export default landingController;
