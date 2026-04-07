/**
 * Participants Store
 * ESG Economic Statecraft Simulation Platform v2.0
 *
 * Centralized store for participant management including:
 * - Active participant tracking
 * - Heartbeat management
 * - Role availability checking
 * - Real-time presence updates
 */

import { database } from '../services/database.js';
import { sessionStore } from './session.js';
import { createLogger } from '../utils/logger.js';
import { CONFIG } from '../core/config.js';

const logger = createLogger('ParticipantsStore');

/**
 * @typedef {Object} Participant
 * @property {string} id - Session participant record ID
 * @property {string} session_id - Session ID
 * @property {string} participant_id - Participant ID (from participants table)
 * @property {string} display_name - Display name (from joined participants table)
 * @property {string} role - Role identifier
 * @property {boolean} is_active - Active status
 * @property {string} heartbeat_at - Last heartbeat timestamp
 * @property {string} last_seen - Last seen timestamp
 * @property {string} joined_at - Join timestamp
 * @property {string} disconnected_at - Disconnect timestamp (if disconnected)
 */

/**
 * Participants Store
 * Manages participant state with heartbeat and real-time sync
 */
class ParticipantsStore {
    constructor() {
        /** @type {Participant[]} */
        this.participants = [];

        /** @type {Set<Function>} */
        this.subscribers = new Set();

        /** @type {boolean} */
        this.initialized = false;

        /** @type {string|null} */
        this.sessionId = null;

        /** @type {string|null} */
        this.currentParticipantId = null;

        /** @type {number|null} */
        this.heartbeatInterval = null;

        /** @type {number|null} */
        this.cleanupInterval = null;
    }

    /**
     * Initialize store with session data
     * @param {string} sessionId - Session ID
     * @param {string} participantId - Current participant's ID
     * @returns {Promise<Participant[]>}
     */
    async initialize(sessionId, participantId = null) {
        if (!sessionId) {
            logger.warn('Cannot initialize without session ID');
            return [];
        }

        this.sessionId = sessionId;
        this.currentParticipantId = participantId;
        logger.info('Initializing participants store for session:', sessionId);

        try {
            await this.loadParticipants();
            this.initialized = true;

            // Start heartbeat if we have a current participant
            if (participantId) {
                this.startHeartbeat();
            }

            // Start inactive participant cleanup
            this.startCleanup();

            this.notify('initialized', this.participants);
            return this.participants;
        } catch (err) {
            logger.error('Failed to initialize participants store:', err);
            throw err;
        }
    }

    /**
     * Load all participants for the current session
     * @returns {Promise<void>}
     */
    async loadParticipants() {
        if (!this.sessionId) {
            return;
        }

        try {
            const data = await database.getActiveParticipants(this.sessionId);

            this.participants = data || [];
            logger.info(`Loaded ${this.participants.length} participants`);
            this.notify('loaded', this.participants);
        } catch (err) {
            logger.error('Failed to load participants:', err);
            throw err;
        }
    }

    /**
     * Get all participants
     * @returns {Participant[]}
     */
    getAll() {
        return [...this.participants];
    }

    /**
     * Get active participants only
     * @returns {Participant[]}
     */
    getActive() {
        const cutoffTime = Date.now() - (CONFIG.HEARTBEAT_INTERVAL_MS * 3);

        return this.participants.filter(p => {
            if (!p.is_active) return false;

            const heartbeatTime = p.heartbeat_at;
            if (!heartbeatTime) return false;

            const lastHeartbeat = new Date(heartbeatTime).getTime();
            return lastHeartbeat > cutoffTime;
        });
    }

    /**
     * Get participants by role
     * @param {string} role - Role identifier
     * @returns {Participant[]}
     */
    getByRole(role) {
        return this.participants.filter(p => p.role === role);
    }

    /**
     * Get active participants by role
     * @param {string} role - Role identifier
     * @returns {Participant[]}
     */
    getActiveByRole(role) {
        return this.getActive().filter(p => p.role === role);
    }

    /**
     * Get participant by ID
     * @param {string} id - Participant ID
     * @returns {Participant|undefined}
     */
    getById(id) {
        return this.participants.find(p => p.id === id);
    }

    /**
     * Get current participant
     * @returns {Participant|undefined}
     */
    getCurrentParticipant() {
        if (!this.currentParticipantId) return undefined;
        return this.getById(this.currentParticipantId);
    }

    /**
     * Check if a role is available
     * @param {string} role - Role identifier
     * @returns {boolean}
     */
    isRoleAvailable(role) {
        const limit = CONFIG.ROLE_LIMITS[role] || 999;
        const activeCount = this.getActiveByRole(role).length;
        return activeCount < limit;
    }

    /**
     * Get available roles
     * @returns {string[]} Array of available role identifiers
     */
    getAvailableRoles() {
        const availableRoles = [];

        Object.keys(CONFIG.ROLE_LIMITS).forEach(role => {
            if (this.isRoleAvailable(role)) {
                availableRoles.push(role);
            }
        });

        return availableRoles;
    }

    /**
     * Get role counts
     * @returns {Object} Role count object
     */
    getRoleCounts() {
        const counts = {};

        this.getActive().forEach(p => {
            counts[p.role] = (counts[p.role] || 0) + 1;
        });

        return counts;
    }

    /**
     * Join session as participant
     * @param {string} displayName - Display name
     * @param {string} role - Role identifier
     * @returns {Promise<Participant>}
     */
    async join(displayName, role) {
        if (!this.sessionId) {
            throw new Error('Store not initialized');
        }

        // Check role availability
        if (!this.isRoleAvailable(role)) {
            throw new Error(`Role "${role}" is not available`);
        }

        logger.info('Joining session as:', role);

        try {
            // Use database.registerParticipant which creates both participant and session_participant records
            const data = await database.registerParticipant(this.sessionId, role, displayName);

            this.participants.push(data);
            // Store the session_participant id, not the participant id
            this.currentParticipantId = data.id;

            // Start heartbeat
            this.startHeartbeat();

            this.notify('joined', data);
            logger.info('Joined session with session_participant id:', data.id);

            return data;
        } catch (err) {
            logger.error('Failed to join session:', err);
            throw err;
        }
    }

    /**
     * Leave session
     * @returns {Promise<void>}
     */
    async leave() {
        if (!this.currentParticipantId || !this.sessionId) {
            return;
        }

        logger.info('Leaving session');

        try {
            await database.disconnectParticipant(this.sessionId, this.currentParticipantId);

            this.stopHeartbeat();

            const participant = this.getById(this.currentParticipantId);
            if (participant) {
                participant.is_active = false;
                participant.disconnected_at = new Date().toISOString();
            }

            this.notify('left', { id: this.currentParticipantId });
            this.currentParticipantId = null;

            logger.info('Left session');
        } catch (err) {
            logger.error('Failed to leave session:', err);
        }
    }

    /**
     * Update participant info
     * @param {string} id - Session participant ID
     * @param {Partial<Participant>} updates - Fields to update
     * @returns {Promise<Participant>}
     */
    async update(id, updates) {
        if (!this.sessionId) {
            throw new Error('Store not initialized');
        }

        try {
            const data = await database.updateParticipant(this.sessionId, id, updates);

            const index = this.participants.findIndex(p => p.id === id);
            if (index !== -1) {
                this.participants[index] = { ...this.participants[index], ...data };
            }

            this.notify('updated', data);
            return data;
        } catch (err) {
            logger.error('Failed to update participant:', err);
            throw err;
        }
    }

    /**
     * Send heartbeat for current participant
     * @returns {Promise<void>}
     */
    async sendHeartbeat() {
        if (!this.currentParticipantId || !this.sessionId) {
            return;
        }

        try {
            const now = new Date().toISOString();

            // updateHeartbeat uses sessionStore.getClientId() internally to find the participant
            await database.updateHeartbeat(this.sessionId);

            // Update local state
            const participant = this.getById(this.currentParticipantId);
            if (participant) {
                participant.heartbeat_at = now;
                participant.last_seen = now;
                participant.is_active = true;
            }

            logger.debug('Heartbeat sent');
        } catch (err) {
            logger.error('Failed to send heartbeat:', err);
        }
    }

    /**
     * Start heartbeat interval
     * @private
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Send initial heartbeat
        this.sendHeartbeat();

        // Set up interval
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, CONFIG.HEARTBEAT_INTERVAL_MS);

        logger.info('Heartbeat started');
    }

    /**
     * Stop heartbeat interval
     * @private
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        logger.info('Heartbeat stopped');
    }

    /**
     * Start inactive participant cleanup interval
     * @private
     */
    startCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Clean up every minute
        this.cleanupInterval = setInterval(() => {
            this.markInactiveParticipants();
        }, 60000);
    }

    /**
     * Mark participants as inactive if heartbeat is stale
     * @private
     */
    markInactiveParticipants() {
        const cutoffTime = Date.now() - (CONFIG.HEARTBEAT_INTERVAL_MS * 3);
        let changed = false;

        this.participants.forEach(participant => {
            if (participant.is_active) {
                const heartbeatTime = participant.heartbeat_at;
                if (!heartbeatTime) return;

                const lastHeartbeat = new Date(heartbeatTime).getTime();

                if (lastHeartbeat < cutoffTime) {
                    participant.is_active = false;
                    changed = true;
                    logger.debug('Marked participant inactive:', participant.id);
                }
            }
        });

        if (changed) {
            this.notify('presence_updated', this.getActive());
        }
    }

    /**
     * Update from server (real-time sync)
     * @param {string} eventType - Event type (INSERT, UPDATE, DELETE)
     * @param {Participant} participant - Participant data
     */
    updateFromServer(eventType, participant) {
        switch (eventType) {
            case 'INSERT':
                if (!this.participants.find(p => p.id === participant.id)) {
                    this.participants.push(participant);
                    this.notify('joined', participant);
                }
                break;

            case 'UPDATE':
                const updateIndex = this.participants.findIndex(p => p.id === participant.id);
                if (updateIndex !== -1) {
                    const wasActive = this.participants[updateIndex].is_active;
                    this.participants[updateIndex] = participant;

                    if (wasActive && !participant.is_active) {
                        this.notify('left', participant);
                    } else {
                        this.notify('updated', participant);
                    }
                }
                break;

            case 'DELETE':
                this.participants = this.participants.filter(p => p.id !== participant.id);
                this.notify('removed', participant);
                break;
        }

        this.notify('presence_updated', this.getActive());
        logger.debug('Participants updated from server:', eventType);
    }

    /**
     * Get participant statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const active = this.getActive();

        return {
            total: this.participants.length,
            active: active.length,
            inactive: this.participants.length - active.length,
            byRole: this.getRoleCounts()
        };
    }

    /**
     * Subscribe to store changes
     * @param {Function} callback - Callback function (event, data)
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
     * @param {*} data - Event data
     */
    notify(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, data);
            } catch (err) {
                logger.error('Subscriber error:', err);
            }
        });
    }

    /**
     * Reset store state
     */
    reset() {
        this.stopHeartbeat();

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.participants = [];
        this.initialized = false;
        this.sessionId = null;
        this.currentParticipantId = null;
        this.subscribers.clear();
        logger.info('Participants store reset');
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.leave();
        this.reset();
    }
}

// Export singleton instance
export const participantsStore = new ParticipantsStore();

export default participantsStore;
