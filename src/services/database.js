/**
 * Database Service
 * CRUD operations for all database tables
 */

import { getRuntimeConfigStatus, supabase } from './supabase.js';
import { sessionStore } from '../stores/session.js';
import { createLogger } from '../utils/logger.js';
import { DatabaseError, NotFoundError, fromSupabaseError } from '../core/errors.js';
import {
    ENUMS,
    canAdjudicateAction,
    canDeleteAction,
    canEditAction,
    canSubmitAction,
    isValidActionStatus
} from '../core/enums.js';

const logger = createLogger('Database');

export function getDatabaseRuntimeStatus() {
    return getRuntimeConfigStatus();
}

export function normalizeObservationTimelineEntries(entries) {
    return Array.isArray(entries)
        ? entries.filter((entry) => entry && typeof entry === 'object')
        : [];
}

export function mergeNotetakerRecord(existingRecord = null, noteData = {}, {
    clientId = null,
    timestamp = new Date().toISOString()
} = {}) {
    const existingTimeline = normalizeObservationTimelineEntries(existingRecord?.observation_timeline);
    const replacementTimeline = Array.isArray(noteData.observation_timeline)
        ? normalizeObservationTimelineEntries(noteData.observation_timeline)
        : null;
    const appendedTimeline = normalizeObservationTimelineEntries(noteData.observation_timeline_append);

    return {
        session_id: noteData.session_id ?? existingRecord?.session_id ?? null,
        move: noteData.move ?? existingRecord?.move ?? null,
        phase: noteData.phase ?? existingRecord?.phase ?? null,
        team: noteData.team ?? existingRecord?.team ?? null,
        client_id: noteData.client_id ?? existingRecord?.client_id ?? clientId ?? null,
        dynamics_analysis: noteData.dynamics_analysis ?? existingRecord?.dynamics_analysis ?? {},
        external_factors: noteData.external_factors ?? existingRecord?.external_factors ?? {},
        observation_timeline: replacementTimeline ?? [...existingTimeline, ...appendedTimeline],
        updated_at: timestamp
    };
}

/**
 * Database service with CRUD operations for all tables
 */
export const database = {
    // ==================== SESSIONS ====================

    /**
     * Create a new session
     * @param {Object} sessionData - Session data
     * @returns {Promise<Object>} Created session
     */
    async createSession(sessionData) {
        logger.debug('Creating session:', sessionData.name);

        // Store session_code and description in metadata since schema only has name, status, metadata
        const metadata = {
            ...sessionData.metadata,
            session_code: sessionData.session_code,
            description: sessionData.description || null
        };

        const { data, error } = await supabase
            .from('sessions')
            .insert({
                name: sessionData.name,
                status: sessionData.status || 'active',
                metadata
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createSession');
        }

        // Also create initial game state
        await this.createGameState(data.id);

        logger.info('Session created:', data.id);
        return data;
    },

    /**
     * Get a session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session data
     */
    async getSession(sessionId) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Session', sessionId);
            }
            throw fromSupabaseError(error, 'getSession');
        }

        return data;
    },

    /**
     * Get all active sessions
     * @returns {Promise<Object[]>} List of sessions
     */
    async getActiveSessions() {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            throw fromSupabaseError(error, 'getActiveSessions');
        }

        return data || [];
    },

    /**
     * Update a session
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated session
     */
    async updateSession(sessionId, updates) {
        const { data, error } = await supabase
            .from('sessions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'updateSession');
        }

        return data;
    },

    /**
     * Delete a session (cascades to all related data)
     * @param {string} sessionId - Session ID
     */
    async deleteSession(sessionId) {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId);

        if (error) {
            throw fromSupabaseError(error, 'deleteSession');
        }

        logger.info('Session deleted:', sessionId);
    },

    // ==================== GAME STATE ====================

    /**
     * Create initial game state for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Created game state
     */
    async createGameState(sessionId) {
        const { data, error } = await supabase
            .from('game_state')
            .insert({
                session_id: sessionId,
                move: 1,
                phase: 1,
                timer_seconds: 5400, // 90 minutes default
                timer_running: false,
                timer_last_update: null
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createGameState');
        }

        return data;
    },

    /**
     * Get game state for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Game state
     */
    async getGameState(sessionId) {
        const { data, error } = await supabase
            .from('game_state')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('GameState', sessionId);
            }
            throw fromSupabaseError(error, 'getGameState');
        }

        return data;
    },

    /**
     * Update game state
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated game state
     */
    async updateGameState(sessionId, updates) {
        // Map any legacy field names to schema field names
        const mappedUpdates = { ...updates };

        // Map current_move -> move, current_phase -> phase
        if ('current_move' in mappedUpdates) {
            mappedUpdates.move = mappedUpdates.current_move;
            delete mappedUpdates.current_move;
        }
        if ('current_phase' in mappedUpdates) {
            mappedUpdates.phase = mappedUpdates.current_phase;
            delete mappedUpdates.current_phase;
        }
        // Map last_update -> timer_last_update for timer updates
        if ('last_update' in mappedUpdates) {
            mappedUpdates.timer_last_update = mappedUpdates.last_update;
            delete mappedUpdates.last_update;
        }

        const { data, error } = await supabase
            .from('game_state')
            .update({
                ...mappedUpdates,
                last_updated: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'updateGameState');
        }

        return data;
    },

    /**
     * Log a game state transition
     * @param {string} sessionId - Session ID
     * @param {string} transitionType - Type of transition (move, phase)
     * @param {number} fromValue - Previous value
     * @param {number} toValue - New value
     */
    async logTransition(sessionId, transitionType, fromValue, toValue) {
        const { error } = await supabase
            .from('game_state_transitions')
            .insert({
                session_id: sessionId,
                transition_type: transitionType,
                from_value: fromValue,
                to_value: toValue,
                client_id: sessionStore.getClientId()
            });

        if (error) {
            logger.error('Failed to log transition:', error);
        }
    },

    // ==================== PARTICIPANTS ====================

    /**
     * Register a participant in a session
     * @param {string} sessionId - Session ID
     * @param {string} role - Participant role
     * @param {string} name - Display name
     * @returns {Promise<Object>} Created session_participant record
     */
    async registerParticipant(sessionId, role, name = '') {
        const clientId = sessionStore.getClientId();

        // Step 1: Get or create participant in participants table
        let participant;
        const { data: existingParticipant } = await supabase
            .from('participants')
            .select('*')
            .eq('client_id', clientId)
            .maybeSingle();

        if (existingParticipant) {
            // Update name if provided
            if (name && name !== existingParticipant.name) {
                const { data: updated, error: updateError } = await supabase
                    .from('participants')
                    .update({ name, updated_at: new Date().toISOString() })
                    .eq('id', existingParticipant.id)
                    .select()
                    .single();

                if (updateError) {
                    throw fromSupabaseError(updateError, 'updateParticipantName');
                }
                participant = updated;
            } else {
                participant = existingParticipant;
            }
        } else {
            // Create new participant
            const { data: newParticipant, error: createError } = await supabase
                .from('participants')
                .insert({
                    client_id: clientId,
                    name: name || null,
                    role: role
                })
                .select()
                .single();

            if (createError) {
                throw fromSupabaseError(createError, 'createParticipant');
            }
            participant = newParticipant;
        }

        // Step 2: Check if session_participant record exists
        const { data: existingSessionParticipant } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('participant_id', participant.id)
            .maybeSingle();

        if (existingSessionParticipant) {
            // Reactivate existing session participant
            const { data: updated, error: updateError } = await supabase
                .from('session_participants')
                .update({
                    role,
                    is_active: true,
                    heartbeat_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                    disconnected_at: null
                })
                .eq('id', existingSessionParticipant.id)
                .select()
                .single();

            if (updateError) {
                throw fromSupabaseError(updateError, 'reactivateSessionParticipant');
            }

            logger.info('Participant reactivated:', { role, sessionId: sessionId.substring(0, 8) });
            return { ...updated, participantName: name };
        }

        // Step 3: Create new session_participant record
        const { data, error } = await supabase
            .from('session_participants')
            .insert({
                session_id: sessionId,
                participant_id: participant.id,
                role,
                is_active: true,
                heartbeat_at: new Date().toISOString(),
                joined_at: new Date().toISOString(),
                last_seen: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'registerParticipant');
        }

        logger.info('Participant registered:', { role, sessionId: sessionId.substring(0, 8) });
        return { ...data, participantName: name };
    },

    /**
     * Update participant record
     * @param {string} sessionId - Session ID
     * @param {string} participantId - Participant ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated record
     */
    async updateParticipant(sessionId, participantId, updates) {
        const { data, error } = await supabase
            .from('session_participants')
            .update(updates)
            .eq('session_id', sessionId)
            .eq('participant_id', participantId)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'updateParticipant');
        }

        return data;
    },

    /**
     * Update heartbeat for current participant
     * @param {string} sessionId - Session ID
     */
    async updateHeartbeat(sessionId) {
        const clientId = sessionStore.getClientId();

        // First get the participant record by client_id
        const { data: participant } = await supabase
            .from('participants')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle();

        if (!participant) {
            logger.error('Heartbeat update failed: participant not found for client', clientId);
            return;
        }

        const { error } = await supabase
            .from('session_participants')
            .update({
                heartbeat_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                is_active: true
            })
            .eq('session_id', sessionId)
            .eq('participant_id', participant.id);

        if (error) {
            logger.error('Heartbeat update failed:', error);
        }
    },

    /**
     * Mark participant as disconnected
     * @param {string} sessionId - Session ID
     * @param {string} participantId - Participant ID
     */
    async disconnectParticipant(sessionId, sessionParticipantId) {
        // sessionParticipantId is the session_participants.id (record ID)
        const { error } = await supabase
            .from('session_participants')
            .update({
                is_active: false,
                left_at: new Date().toISOString(),
                disconnected_at: new Date().toISOString()
            })
            .eq('id', sessionParticipantId)
            .eq('session_id', sessionId);

        if (error) {
            logger.error('Disconnect update failed:', error);
        }
    },

    /**
     * Get active participants for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object[]>} Active participants with names from participants table
     */
    async getActiveParticipants(sessionId) {
        const cutoff = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago

        const { data, error } = await supabase
            .from('session_participants')
            .select('*, participants(name, client_id)')
            .eq('session_id', sessionId)
            .eq('is_active', true)
            .gt('heartbeat_at', cutoff);

        if (error) {
            throw fromSupabaseError(error, 'getActiveParticipants');
        }

        // Flatten the participant name into the result for easier access
        return (data || []).map(sp => ({
            ...sp,
            display_name: sp.participants?.name || 'Unknown',
            client_id: sp.participants?.client_id
        }));
    },

    /**
     * Check role availability
     * @param {string} sessionId - Session ID
     * @param {string} role - Role to check
     * @param {number} maxAllowed - Maximum allowed for this role
     * @returns {Promise<Object>} Availability info
     */
    async checkRoleAvailability(sessionId, role, maxAllowed) {
        const cutoff = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago

        const { data, error } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('role', role)
            .eq('is_active', true)
            .gt('heartbeat_at', cutoff);

        if (error) {
            logger.error('Role availability check failed:', error);
            return { available: true }; // Fail open
        }

        return {
            available: (data?.length || 0) < maxAllowed,
            currentCount: data?.length || 0,
            maxAllowed,
            activeParticipants: data || []
        };
    },

    // ==================== ACTIONS ====================

    /**
     * Create an action
     * @param {Object} actionData - Action data
     * @returns {Promise<Object>} Created action
     */
    async createAction(actionData) {
        const status = actionData.status ?? ENUMS.ACTION_STATUS.DRAFT;
        if (!isValidActionStatus(status)) {
            throw new DatabaseError(`Invalid action status: ${status}`, 'createAction');
        }

        const { data, error } = await supabase
            .from('actions')
            .insert({
                session_id: actionData.session_id,
                client_id: actionData.client_id,
                move: actionData.move,
                phase: actionData.phase,
                team: actionData.team,
                mechanism: actionData.mechanism,
                sector: actionData.sector,
                exposure_type: actionData.exposure_type,
                targets: actionData.targets || [],
                goal: actionData.goal,
                expected_outcomes: actionData.expected_outcomes,
                ally_contingencies: actionData.ally_contingencies,
                priority: actionData.priority,
                status,
                submitted_at: actionData.submitted_at || null,
                adjudicated_at: actionData.adjudicated_at || null
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createAction');
        }

        logger.info('Action created:', data.id);
        return data;
    },

    /**
     * Get actions for a session
     * @param {string} sessionId - Session ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object[]>} Actions
     */
    async fetchActions(sessionId, filters = {}) {
        let query = supabase
            .from('actions')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (filters.move) {
            query = query.eq('move', filters.move);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
            query = query.in('status', filters.statuses);
        }

        if (filters.team) {
            query = query.eq('team', filters.team);
        }

        const { data, error } = await query;

        if (error) {
            throw fromSupabaseError(error, 'fetchActions');
        }

        return data || [];
    },

    /**
     * Get a single action by ID
     * @param {string} actionId - Action ID
     * @returns {Promise<Object>} Action
     */
    async getAction(actionId) {
        const { data, error } = await supabase
            .from('actions')
            .select('*')
            .eq('id', actionId)
            .eq('is_deleted', false)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Action', actionId);
            }
            throw fromSupabaseError(error, 'getAction');
        }

        return data;
    },

    /**
     * Update an action
     * @param {string} actionId - Action ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated action
     */
    async updateAction(actionId, updates) {
        if ('status' in updates && !isValidActionStatus(updates.status)) {
            throw new DatabaseError(`Invalid action status: ${updates.status}`, 'updateAction');
        }

        const { data, error } = await supabase
            .from('actions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', actionId)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'updateAction');
        }

        return data;
    },

    /**
     * Update a draft action only
     * @param {string} actionId - Action ID
     * @param {Object} updates - Updates to apply to a draft action
     * @returns {Promise<Object>} Updated action
     */
    async updateDraftAction(actionId, updates) {
        const existingAction = await this.getAction(actionId);

        if (!canEditAction(existingAction)) {
            throw new DatabaseError('Only draft actions can be edited.', 'updateDraftAction');
        }

        const {
            status,
            submitted_at,
            adjudicated_at,
            outcome,
            adjudication_notes,
            ...draftUpdates
        } = updates;

        return this.updateAction(actionId, draftUpdates);
    },

    /**
     * Submit a draft action for White Cell review
     * @param {string} actionId - Action ID
     * @returns {Promise<Object>} Updated action
     */
    async submitAction(actionId) {
        const existingAction = await this.getAction(actionId);

        if (!canSubmitAction(existingAction)) {
            throw new DatabaseError('Only draft actions can be submitted.', 'submitAction');
        }

        return this.updateAction(actionId, {
            status: ENUMS.ACTION_STATUS.SUBMITTED,
            submitted_at: new Date().toISOString()
        });
    },

    /**
     * Adjudicate a submitted action
     * @param {string} actionId - Action ID
     * @param {Object} adjudication - Adjudication data
     * @returns {Promise<Object>} Updated action
     */
    async adjudicateAction(actionId, adjudication = {}) {
        const existingAction = await this.getAction(actionId);

        if (!canAdjudicateAction(existingAction)) {
            throw new DatabaseError('Only submitted actions can be adjudicated.', 'adjudicateAction');
        }

        return this.updateAction(actionId, {
            status: ENUMS.ACTION_STATUS.ADJUDICATED,
            outcome: adjudication.outcome,
            adjudication_notes: adjudication.adjudication_notes || null,
            adjudicated_at: adjudication.adjudicated_at || new Date().toISOString()
        });
    },

    /**
     * Delete an action (soft delete)
     * @param {string} actionId - Action ID
     */
    async deleteAction(actionId) {
        const { error } = await supabase
            .from('actions')
            .update({
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', actionId);

        if (error) {
            throw fromSupabaseError(error, 'deleteAction');
        }

        logger.info('Action deleted:', actionId);
    },

    /**
     * Delete a draft action only
     * @param {string} actionId - Action ID
     */
    async deleteDraftAction(actionId) {
        const existingAction = await this.getAction(actionId);

        if (!canDeleteAction(existingAction)) {
            throw new DatabaseError('Only draft actions can be deleted.', 'deleteDraftAction');
        }

        await this.deleteAction(actionId);
    },

    // ==================== REQUESTS (RFIs) ====================

    /**
     * Create a request (RFI)
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} Created request
     */
    async createRequest(requestData) {
        const query = requestData.query ?? requestData.question ?? null;
        const { data, error } = await supabase
            .from('requests')
            .insert({
                session_id: requestData.session_id,
                team: requestData.team,
                client_id: requestData.client_id,
                move: requestData.move,
                phase: requestData.phase,
                priority: requestData.priority,
                categories: requestData.categories,
                query,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createRequest');
        }

        logger.info('Request created:', data.id);
        return data;
    },

    /**
     * Get requests for a session
     * @param {string} sessionId - Session ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object[]>} Requests
     */
    async fetchRequests(sessionId, filters = {}) {
        let query = supabase
            .from('requests')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.move) {
            query = query.eq('move', filters.move);
        }

        if (filters.team) {
            query = query.eq('team', filters.team);
        }

        const { data, error } = await query;

        if (error) {
            throw fromSupabaseError(error, 'fetchRequests');
        }

        return data || [];
    },

    /**
     * Update a request
     * @param {string} requestId - Request ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated request
     */
    async updateRequest(requestId, updates) {
        const { data, error } = await supabase
            .from('requests')
            .update(updates)
            .eq('id', requestId)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'updateRequest');
        }

        return data;
    },

    // ==================== COMMUNICATIONS ====================

    /**
     * Create a communication
     * @param {Object} commData - Communication data
     * @returns {Promise<Object>} Created communication
     */
    async createCommunication(commData) {
        const { data, error } = await supabase
            .from('communications')
            .insert({
                session_id: commData.session_id,
                linked_request_id: commData.linked_request_id || null,
                type: commData.type,
                from_role: commData.from_role,
                to_role: commData.to_role || 'all',
                content: commData.content,
                metadata: commData.metadata || {}
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createCommunication');
        }

        return data;
    },

    /**
     * Get communications for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object[]>} Communications
     */
    async fetchCommunications(sessionId) {
        const { data, error } = await supabase
            .from('communications')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) {
            throw fromSupabaseError(error, 'fetchCommunications');
        }

        return data || [];
    },

    // ==================== TIMELINE ====================

    /**
     * Create a timeline event
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} Created event
     */
    async createTimelineEvent(eventData) {
        const rawMetadata = eventData.metadata && typeof eventData.metadata === 'object'
            ? { ...eventData.metadata }
            : null;
        const category = eventData.category ?? rawMetadata?.category ?? null;
        const factionTag = eventData.faction_tag ?? rawMetadata?.faction_tag ?? null;
        const debateMarker = eventData.debate_marker ?? rawMetadata?.debate_marker ?? null;
        if (rawMetadata) {
            delete rawMetadata.category;
            delete rawMetadata.faction_tag;
            delete rawMetadata.debate_marker;
        }
        const metadata = rawMetadata && Object.keys(rawMetadata).length ? rawMetadata : null;
        const type = eventData.type ?? eventData.event_type ?? null;
        const content = eventData.content ?? eventData.description ?? null;

        const { data, error } = await supabase
            .from('timeline')
            .insert({
                session_id: eventData.session_id,
                team: eventData.team || 'blue',
                type,
                content,
                category,
                faction_tag: factionTag,
                debate_marker: debateMarker,
                metadata,
                move: eventData.move,
                phase: eventData.phase,
                client_id: eventData.client_id
            })
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createTimelineEvent');
        }

        return data;
    },

    /**
     * Get timeline events for a session
     * @param {string} sessionId - Session ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object[]>} Timeline events
     */
    async fetchTimeline(sessionId, filters = {}) {
        let query = supabase
            .from('timeline')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (filters.type) {
            query = query.eq('type', filters.type);
        }

        if (filters.team) {
            query = query.eq('team', filters.team);
        }

        if (filters.move) {
            query = query.eq('move', filters.move);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw fromSupabaseError(error, 'fetchTimeline');
        }

        return data || [];
    },

    /**
     * Get a full monitoring/export bundle for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session bundle
     */
    async fetchSessionBundle(sessionId) {
        const [session, gameState, participants, actions, requests, timeline] = await Promise.all([
            this.getSession(sessionId),
            this.getGameState(sessionId).catch(() => null),
            this.getActiveParticipants(sessionId).catch(() => []),
            this.fetchActions(sessionId).catch(() => []),
            this.fetchRequests(sessionId).catch(() => []),
            this.fetchTimeline(sessionId).catch(() => [])
        ]);

        return {
            session,
            gameState,
            participants,
            actions,
            requests,
            timeline
        };
    },

    // ==================== NOTETAKER DATA ====================

    /**
     * Save or update notetaker data
     * @param {Object} noteData - Notetaker data
     * @returns {Promise<Object>} Saved data
     */
    async saveNotetakerData(noteData) {
        const timestamp = new Date().toISOString();
        const { data: existing, error: existingError } = await supabase
            .from('notetaker_data')
            .select('*')
            .eq('session_id', noteData.session_id)
            .eq('move', noteData.move)
            .maybeSingle();

        if (existingError) {
            throw fromSupabaseError(existingError, 'getNotetakerDataForSave');
        }

        const mergedRecord = mergeNotetakerRecord(existing, noteData, {
            clientId: sessionStore.getClientId(),
            timestamp
        });

        if (existing) {
            const { data, error } = await supabase
                .from('notetaker_data')
                .update(mergedRecord)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                throw fromSupabaseError(error, 'updateNotetakerData');
            }

            return data;
        }

        // Create new
        const { data, error } = await supabase
            .from('notetaker_data')
            .insert(mergedRecord)
            .select()
            .single();

        if (error) {
            throw fromSupabaseError(error, 'createNotetakerData');
        }

        return data;
    },

    /**
     * Get notetaker data for a specific session and move
     * @param {string} sessionId - Session ID
     * @param {number} move - Move number
     * @returns {Promise<Object|null>} Notetaker data for the move
     */
    async getNotetakerData(sessionId, move) {
        const { data, error } = await supabase
            .from('notetaker_data')
            .select('*')
            .eq('session_id', sessionId)
            .eq('move', move)
            .maybeSingle();

        if (error) {
            throw fromSupabaseError(error, 'getNotetakerData');
        }

        return data;
    },

    /**
     * Get notetaker data for a session
     * @param {string} sessionId - Session ID
     * @param {number} [move] - Specific move (optional)
     * @returns {Promise<Object[]>} Notetaker data
     */
    async fetchNotetakerData(sessionId, move = null) {
        let query = supabase
            .from('notetaker_data')
            .select('*')
            .eq('session_id', sessionId)
            .order('move', { ascending: true });

        if (move !== null && move !== undefined) {
            query = query.eq('move', move);
        }

        const { data, error } = await query;

        if (error) {
            throw fromSupabaseError(error, 'fetchNotetakerData');
        }

        return data || [];
    }
};

export default database;
