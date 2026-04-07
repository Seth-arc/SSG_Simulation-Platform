/**
 * Game State Store
 * ESG Economic Statecraft Simulation Platform v2.0
 *
 * Centralized store for game state management including:
 * - Current move and phase tracking
 * - Timer state management
 * - Game status
 *
 * This store uses a pub/sub pattern for reactive updates across the application.
 */

import { database } from '../services/database.js';
import { sessionStore } from './session.js';
import { createLogger } from '../utils/logger.js';
import { CONFIG } from '../core/config.js';
import { ENUMS } from '../core/enums.js';

const logger = createLogger('GameStateStore');

/**
 * @typedef {Object} GameState
 * @property {string} id - Game state record ID
 * @property {string} session_id - Associated session ID
 * @property {number} move - Current move (1-3)
 * @property {number} phase - Current phase (1-5)
 * @property {number} timer_seconds - Remaining timer seconds
 * @property {boolean} timer_running - Whether timer is active
 * @property {string} timer_last_update - ISO timestamp of last timer update
 * @property {string} last_updated - ISO timestamp of last update
 * @property {string} status - Game status (active, paused, completed)
 */

/**
 * Game State Store
 * Manages game state with real-time synchronization
 */
class GameStateStore {
    constructor() {
        /** @type {GameState|null} */
        this.state = null;

        /** @type {Set<Function>} */
        this.subscribers = new Set();

        /** @type {boolean} */
        this.initialized = false;

        /** @type {number|null} */
        this.timerInterval = null;

        /** @type {number} */
        this.lastServerSync = 0;
    }

    /**
     * Initialize the store with session data
     * @param {string} sessionId - Session ID to load
     * @returns {Promise<GameState|null>}
     */
    async initialize(sessionId) {
        if (!sessionId) {
            logger.warn('Cannot initialize without session ID');
            return null;
        }

        logger.info('Initializing game state store for session:', sessionId);

        try {
            const data = await database.getGameState(sessionId);

            if (data) {
                this.state = data;
                this.initialized = true;
                this.notify('initialized', this.state);

                // Resume timer if it was running
                if (data.timer_running) {
                    this.startLocalTimer();
                }

                logger.info('Game state loaded:', {
                    move: data.move,
                    phase: data.phase,
                    timerRunning: data.timer_running
                });
            } else {
                // Create initial game state if it doesn't exist
                await this.createInitialState(sessionId);
            }

            return this.state;
        } catch (err) {
            logger.error('Failed to initialize game state:', err);
            throw err;
        }
    }

    /**
     * Create initial game state for a new session
     * @param {string} sessionId - Session ID
     * @returns {Promise<GameState>}
     */
    async createInitialState(sessionId) {
        const initialState = {
            session_id: sessionId,
            move: 1,
            phase: 1,
            timer_seconds: CONFIG.DEFAULT_TIMER_SECONDS,
            timer_running: false,
            timer_last_update: null,
            status: 'active'
        };

        const data = await database.createGameState(sessionId);

        this.state = data;
        this.initialized = true;
        this.notify('created', this.state);

        logger.info('Initial game state created');
        return this.state;
    }

    /**
     * Get current game state
     * @returns {GameState|null}
     */
    getState() {
        return this.state;
    }

    /**
     * Get current move
     * @returns {number}
     */
    getCurrentMove() {
        return this.state?.move || 1;
    }

    /**
     * Get current phase
     * @returns {number}
     */
    getCurrentPhase() {
        return this.state?.phase || 1;
    }

    /**
     * Get timer seconds
     * @returns {number}
     */
    getTimerSeconds() {
        return this.state?.timer_seconds || CONFIG.DEFAULT_TIMER_SECONDS;
    }

    /**
     * Check if timer is running
     * @returns {boolean}
     */
    isTimerRunning() {
        return this.state?.timer_running || false;
    }

    /**
     * Start the game timer
     * @returns {Promise<void>}
     */
    async startTimer() {
        if (!this.state || this.state.timer_running) {
            return;
        }

        logger.info('Starting timer');

        this.state.timer_running = true;
        this.state.timer_last_update = new Date().toISOString();

        await this.syncToServer();
        this.startLocalTimer();
        this.notify('timer_started', this.state);
    }

    /**
     * Pause the game timer
     * @returns {Promise<void>}
     */
    async pauseTimer() {
        if (!this.state || !this.state.timer_running) {
            return;
        }

        logger.info('Pausing timer');

        this.state.timer_running = false;
        this.state.timer_last_update = new Date().toISOString();

        this.stopLocalTimer();
        await this.syncToServer();
        this.notify('timer_paused', this.state);
    }

    /**
     * Reset the timer to default value
     * @param {number} seconds - Optional custom seconds value
     * @returns {Promise<void>}
     */
    async resetTimer(seconds = CONFIG.DEFAULT_TIMER_SECONDS) {
        if (!this.state) {
            return;
        }

        logger.info('Resetting timer to', seconds, 'seconds');

        this.stopLocalTimer();
        this.state.timer_seconds = seconds;
        this.state.timer_running = false;
        this.state.timer_last_update = new Date().toISOString();

        await this.syncToServer();
        this.notify('timer_reset', this.state);
    }

    /**
     * Set timer to specific value
     * @param {number} seconds - Timer value in seconds
     * @returns {Promise<void>}
     */
    async setTimer(seconds) {
        if (!this.state) {
            return;
        }

        this.state.timer_seconds = Math.max(0, seconds);
        this.state.timer_last_update = new Date().toISOString();

        await this.syncToServer();
        this.notify('timer_updated', this.state);
    }

    /**
     * Start local timer interval
     * @private
     */
    startLocalTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            if (this.state && this.state.timer_running && this.state.timer_seconds > 0) {
                this.state.timer_seconds--;
                this.notify('timer_tick', this.state);

                // Sync to server every 30 seconds to prevent drift
                const now = Date.now();
                if (now - this.lastServerSync >= 30000) {
                    this.syncToServer();
                    this.lastServerSync = now;
                }

                // Timer finished
                if (this.state.timer_seconds <= 0) {
                    this.pauseTimer();
                    this.notify('timer_finished', this.state);
                }
            }
        }, 1000);
    }

    /**
     * Stop local timer interval
     * @private
     */
    stopLocalTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Advance to next phase
     * @returns {Promise<boolean>} Success status
     */
    async advancePhase() {
        if (!this.state) {
            return false;
        }

        const currentPhase = this.state.phase;

        // Check if at max phase
        if (currentPhase >= 5) {
            logger.warn('Already at maximum phase');
            return false;
        }

        const newPhase = currentPhase + 1;
        logger.info('Advancing phase from', currentPhase, 'to', newPhase);

        this.state.phase = newPhase;

        await this.syncToServer();
        this.notify('phase_advanced', this.state);

        return true;
    }

    /**
     * Advance to next move
     * @returns {Promise<boolean>} Success status
     */
    async advanceMove() {
        if (!this.state) {
            return false;
        }

        const currentMove = this.state.move;

        // Check if at max move
        if (currentMove >= 3) {
            logger.warn('Already at maximum move');
            return false;
        }

        const newMove = currentMove + 1;
        logger.info('Advancing move from', currentMove, 'to', newMove);

        this.state.move = newMove;
        this.state.phase = 1; // Reset phase on move advance

        await this.syncToServer();
        this.notify('move_advanced', this.state);

        return true;
    }

    /**
     * Set game status
     * @param {string} status - New status (active, paused, completed)
     * @returns {Promise<void>}
     */
    async setStatus(status) {
        if (!this.state) {
            return;
        }

        logger.info('Setting game status to:', status);

        this.state.status = status;

        if (status === 'paused' || status === 'completed') {
            await this.pauseTimer();
        }

        await this.syncToServer();
        this.notify('status_changed', this.state);
    }

    /**
     * Sync current state to server
     * @private
     * @returns {Promise<void>}
     */
    async syncToServer() {
        if (!this.state?.session_id) {
            return;
        }

        try {
            await database.updateGameState(this.state.session_id, {
                move: this.state.move,
                phase: this.state.phase,
                timer_seconds: this.state.timer_seconds,
                timer_running: this.state.timer_running,
                timer_last_update: this.state.timer_last_update,
                status: this.state.status
            });

            this.lastServerSync = Date.now();
        } catch (err) {
            logger.error('Error syncing game state:', err);
        }
    }

    /**
     * Update state from server (for real-time sync)
     * @param {Partial<GameState>} updates - State updates from server
     */
    updateFromServer(updates) {
        if (!this.state) {
            this.state = updates;
        } else {
            // Only apply if server update is newer
            const serverTime = new Date(updates.last_updated || updates.timer_last_update).getTime();
            const localTime = new Date(this.state.last_updated || this.state.timer_last_update).getTime();

            if (serverTime > localTime || isNaN(localTime)) {
                const wasRunning = this.state.timer_running;
                Object.assign(this.state, updates);

                // Handle timer state changes from server
                if (updates.timer_running && !wasRunning) {
                    this.startLocalTimer();
                } else if (!updates.timer_running && wasRunning) {
                    this.stopLocalTimer();
                }

                this.notify('synced', this.state);
                logger.debug('Game state updated from server');
            }
        }
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Callback function (event, state)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers
     * @private
     * @param {string} event - Event type
     * @param {GameState} state - Current state
     */
    notify(event, state) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, { ...state });
            } catch (err) {
                logger.error('Subscriber error:', err);
            }
        });
    }

    /**
     * Reset store state
     */
    reset() {
        this.stopLocalTimer();
        this.state = null;
        this.initialized = false;
        this.subscribers.clear();
        logger.info('Game state store reset');
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.stopLocalTimer();
        this.subscribers.clear();
    }
}

// Export singleton instance
export const gameStateStore = new GameStateStore();

export default gameStateStore;
