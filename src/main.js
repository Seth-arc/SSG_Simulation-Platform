/**
 * Main Application Entry Point
 * ESG Economic Statecraft Simulation Platform v2.0
 *
 * This module initializes core application functionality shared across all roles.
 */

import { sessionStore } from './stores/session.js';
import { database } from './services/database.js';
import { getRuntimeConfigStatus, renderMissingBackendNotice } from './services/supabase.js';
import { createLogger } from './utils/logger.js';
import { showToast } from './components/ui/Toast.js';
import { hideLoader } from './components/ui/Loader.js';
import { ConfigurationError } from './core/errors.js';
import { CONFIG } from './core/config.js';
import { buildAppPath, isLandingPage, navigateToApp } from './core/navigation.js';

const logger = createLogger('Main');
const runtimeConfigStatus = getRuntimeConfigStatus();

// Heartbeat interval reference
let heartbeatInterval = null;
let disconnectKeepaliveHandler = null;
let suppressDisconnectKeepalive = false;

/**
 * Initialize the application
 */
async function initApp() {
    logger.info('Initializing ESG Simulation Platform v2.0');

    if (!runtimeConfigStatus.ready) {
        logger.error('Backend configuration is missing:', runtimeConfigStatus.issues);
        renderMissingBackendNotice();
        hideLoader();
        return;
    }

    // Setup global error handling
    setupErrorHandling();

    // Setup connection indicator
    setupConnectionIndicator();

    // Setup logout handler
    setupLogoutHandler();

    // Setup sidebar navigation
    setupSidebarNavigation();

    // Setup mobile menu toggle
    setupMobileMenu();

    // Initialize session from storage
    initializeSession();

    // Start heartbeat for participant presence (if in a session)
    await startHeartbeat();

    // Hide any loading overlay
    hideLoader();

    logger.info('Application initialized');
}

/**
 * Setup global error handling
 */
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        logger.error('Uncaught error:', event.error);
        if (event.error instanceof ConfigurationError) {
            return;
        }
        showToast({
            message: 'An unexpected error occurred',
            type: 'error'
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection:', event.reason);
        if (event.reason instanceof ConfigurationError) {
            return;
        }
        showToast({
            message: 'An operation failed unexpectedly',
            type: 'error'
        });
    });
}

/**
 * Setup connection status indicator
 */
function setupConnectionIndicator() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    function updateConnectionStatus() {
        if (navigator.onLine) {
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
            indicator.title = 'Connected';
        } else {
            indicator.classList.remove('connected');
            indicator.classList.add('disconnected');
            indicator.title = 'Disconnected';
            showToast({
                message: 'Connection lost. Some features may be unavailable.',
                type: 'warning'
            });
        }
    }

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        // Stop heartbeat
        stopHeartbeat();

        // Mark participant as inactive
        const sessionId = sessionStore.getSessionId();
        const participantId = sessionStore.getSessionParticipantId?.() || sessionStore.getSessionData()?.participantId;
        if (sessionId && participantId) {
            try {
                suppressDisconnectKeepalive = true;
                await database.disconnectParticipant(sessionId, participantId);
            } catch (err) {
                logger.error('Failed to disconnect participant:', err);
            }
        }

        // Clear session data
        sessionStore.clear();

        // Redirect to home
        navigateToApp('');
    });
}

/**
 * Start heartbeat to maintain participant presence
 */
async function startHeartbeat() {
    const sessionId = sessionStore.getSessionId();
    const sessionData = sessionStore.getSessionData();
    const participantId = sessionStore.getSessionParticipantId?.() || sessionData?.participantId;

    // Only start heartbeat if we have a valid session and are not on landing page
    if (!sessionId || !participantId) {
        logger.debug('No active session, skipping heartbeat');
        return;
    }

    // Don't start heartbeat on landing page
    if (isLandingPage()) {
        return;
    }

    logger.info('Starting participant heartbeat');

    // Send initial heartbeat immediately
    try {
        await database.updateHeartbeat(sessionId, participantId);
        logger.debug('Initial heartbeat sent');
    } catch (err) {
        logger.error('Initial heartbeat failed:', err);
    }

    // Set up interval for regular heartbeats (every 30 seconds)
    heartbeatInterval = setInterval(async () => {
        try {
            await database.updateHeartbeat(sessionId, participantId);
            logger.debug('Heartbeat sent');
        } catch (err) {
            logger.error('Heartbeat failed:', err);
        }
    }, CONFIG.HEARTBEAT_INTERVAL_MS);

    if (disconnectKeepaliveHandler) {
        window.removeEventListener('pagehide', disconnectKeepaliveHandler);
    }

    disconnectKeepaliveHandler = () => {
        if (!suppressDisconnectKeepalive) {
            void database.disconnectParticipantKeepalive(sessionId, participantId);
        }
    };

    window.addEventListener('pagehide', disconnectKeepaliveHandler);
}

/**
 * Stop the heartbeat interval
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        logger.info('Heartbeat stopped');
    }

    if (disconnectKeepaliveHandler) {
        window.removeEventListener('pagehide', disconnectKeepaliveHandler);
        disconnectKeepaliveHandler = null;
    }
}

/**
 * Setup sidebar navigation
 */
function setupSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
    const sections = document.querySelectorAll('.content-section');

    if (!sidebarLinks.length || !sections.length) return;

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;

            // Update active link
            sidebarLinks.forEach(l => l.classList.remove('sidebar-link-active'));
            link.classList.add('sidebar-link-active');

            // Show corresponding section
            sections.forEach(section => {
                if (section.id === `${sectionId}Section`) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });

            // Close mobile sidebar if open
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('sidebar-overlay-visible');
            }
        });
    });
}

/**
 * Setup mobile menu toggle
 */
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar) return;

    function toggleSidebar() {
        sidebar.classList.toggle('sidebar-open');
        if (overlay) {
            overlay.classList.toggle('sidebar-overlay-visible');
        }
    }

    function closeSidebar() {
        sidebar.classList.remove('sidebar-open');
        if (overlay) {
            overlay.classList.remove('sidebar-overlay-visible');
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
}

/**
 * Initialize session from storage
 */
function initializeSession() {
    const sessionNameEl = document.getElementById('sessionName');

    function syncSessionUi(snapshot = sessionStore.getSnapshot()) {
        const sessionId = snapshot.sessionId;
        const sessionData = snapshot.sessionData;

        if (sessionNameEl && sessionData?.name) {
            sessionNameEl.textContent = sessionData.name;
        } else if (sessionNameEl) {
            sessionNameEl.textContent = sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'No session';
        }

        updateGameStateDisplay(sessionData?.gameState);
    }

    sessionStore.subscribe((snapshot) => {
        syncSessionUi(snapshot);
    });
}

/**
 * Update the game state display in the header
 * @param {Object} gameState - Current game state
 */
function updateGameStateDisplay(gameState) {
    const headerMove = document.getElementById('headerMove');
    const headerPhase = document.getElementById('headerPhase');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerStatus = document.getElementById('timerStatus');

    if (headerMove) {
        headerMove.textContent = gameState?.move ?? 1;
    }

    if (headerPhase) {
        headerPhase.textContent = gameState?.phase ?? 1;
    }

    if (timerDisplay && gameState?.timer_seconds !== undefined) {
        timerDisplay.textContent = formatTime(gameState.timer_seconds);
    }

    if (timerStatus) {
        if (gameState?.timer_running) {
            timerStatus.textContent = 'Running';
            timerStatus.classList.add('timer-running');
        } else {
            timerStatus.textContent = 'Paused';
            timerStatus.classList.remove('timer-running');
        }
    }
}

/**
 * Format seconds to MM:SS display
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for use by role-specific modules
export {
    updateGameStateDisplay,
    formatTime
};
