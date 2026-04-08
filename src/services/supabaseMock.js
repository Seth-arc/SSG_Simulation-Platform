const E2E_MOCK_FLAG_KEY = 'esg_e2e_mock';
const E2E_MOCK_STATE_KEY = 'esg_e2e_backend_state';
const E2E_MOCK_AUTH_KEY = 'esg_e2e_auth_session';

const MOCK_TABLES = [
    'sessions',
    'game_state',
    'participants',
    'session_participants',
    'actions',
    'requests',
    'communications',
    'timeline',
    'notetaker_data'
];

function cloneValue(value) {
    return value === undefined
        ? undefined
        : JSON.parse(JSON.stringify(value));
}

function getStorage() {
    try {
        return globalThis.localStorage ?? null;
    } catch (_error) {
        return null;
    }
}

function buildInitialMockState() {
    return {
        counters: Object.fromEntries(MOCK_TABLES.map((tableName) => [tableName, 0])),
        tables: Object.fromEntries(MOCK_TABLES.map((tableName) => [tableName, []]))
    };
}

function readMockState() {
    const storage = getStorage();
    if (!storage) {
        return buildInitialMockState();
    }

    const rawState = storage.getItem(E2E_MOCK_STATE_KEY);
    if (!rawState) {
        return buildInitialMockState();
    }

    try {
        const parsedState = JSON.parse(rawState);
        return {
            counters: {
                ...buildInitialMockState().counters,
                ...(parsedState.counters || {})
            },
            tables: {
                ...buildInitialMockState().tables,
                ...(parsedState.tables || {})
            }
        };
    } catch (_error) {
        return buildInitialMockState();
    }
}

function writeMockState(state) {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    storage.setItem(E2E_MOCK_STATE_KEY, JSON.stringify(state));
}

function readMockAuthSession() {
    const storage = getStorage();
    if (!storage) {
        return null;
    }

    const rawSession = storage.getItem(E2E_MOCK_AUTH_KEY);
    if (!rawSession) {
        return null;
    }

    try {
        return JSON.parse(rawSession);
    } catch (_error) {
        return null;
    }
}

function writeMockAuthSession(session) {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    if (!session) {
        storage.removeItem(E2E_MOCK_AUTH_KEY);
        return;
    }

    storage.setItem(E2E_MOCK_AUTH_KEY, JSON.stringify(session));
}

function nextId(state, tableName) {
    state.counters[tableName] = (state.counters[tableName] || 0) + 1;
    const normalizedName = tableName.replace(/[^a-z0-9]+/gi, '_');
    return `${normalizedName}_${state.counters[tableName]}`;
}

function getTimestamp() {
    return new Date().toISOString();
}

function normalizeInsertRow(tableName, payload, state) {
    const timestamp = getTimestamp();
    const baseRow = {
        id: payload.id || nextId(state, tableName),
        created_at: payload.created_at || timestamp
    };

    switch (tableName) {
        case 'sessions':
            return {
                ...baseRow,
                status: 'active',
                session_code: null,
                metadata: {},
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        case 'game_state':
            return {
                ...baseRow,
                move: 1,
                phase: 1,
                timer_seconds: 0,
                timer_running: false,
                timer_last_update: null,
                updated_at: timestamp,
                last_updated: timestamp,
                ...cloneValue(payload)
            };
        case 'participants':
            return {
                ...baseRow,
                name: null,
                role: null,
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        case 'session_participants':
            return {
                ...baseRow,
                role: null,
                is_active: true,
                heartbeat_at: timestamp,
                joined_at: timestamp,
                last_seen: timestamp,
                disconnected_at: null,
                left_at: null,
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        case 'actions':
            return {
                ...baseRow,
                targets: [],
                is_deleted: false,
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        case 'requests':
            return {
                ...baseRow,
                categories: [],
                status: 'pending',
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        case 'communications':
        case 'timeline':
        case 'notetaker_data':
            return {
                ...baseRow,
                updated_at: timestamp,
                ...cloneValue(payload)
            };
        default:
            return {
                ...baseRow,
                updated_at: timestamp,
                ...cloneValue(payload)
            };
    }
}

function compareValues(left, right) {
    if (Array.isArray(left) || Array.isArray(right)) {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    return left === right;
}

function applyFilters(rows, filters) {
    return rows.filter((row) => filters.every((filter) => filter(row)));
}

function sortRows(rows, orderBy) {
    if (!orderBy) {
        return rows;
    }

    const factor = orderBy.ascending ? 1 : -1;
    return [...rows].sort((left, right) => {
        const leftValue = left?.[orderBy.field];
        const rightValue = right?.[orderBy.field];

        if (leftValue === rightValue) {
            return 0;
        }

        if (leftValue === undefined || leftValue === null) {
            return 1 * factor;
        }

        if (rightValue === undefined || rightValue === null) {
            return -1 * factor;
        }

        return leftValue > rightValue ? factor : -factor;
    });
}

function shapeSelectedRows(tableName, rows, selectClause, state) {
    const shapedRows = cloneValue(rows);

    if (tableName !== 'session_participants' || typeof selectClause !== 'string') {
        return shapedRows;
    }

    if (!selectClause.includes('participants(')) {
        return shapedRows;
    }

    return shapedRows.map((row) => {
        const participant = state.tables.participants.find((entry) => entry.id === row.participant_id);

        return {
            ...row,
            participants: participant
                ? {
                    name: participant.name ?? null,
                    client_id: participant.client_id ?? null
                }
                : null
        };
    });
}

function normalizeSeatRole(role = '') {
    return /^(blue|red|green)_whitecell$/.test(role)
        ? role.replace(/_whitecell$/, '_whitecell_lead')
        : role;
}

function getSessionRoleSeatLimit(role = '') {
    const normalizedRole = normalizeSeatRole(role);

    if (/^(blue|red|green)_facilitator$/.test(normalizedRole)) {
        return 1;
    }
    if (/^(blue|red|green)_notetaker$/.test(normalizedRole)) {
        return 4;
    }
    if (normalizedRole === 'viewer') {
        return 5;
    }
    if (/^(blue|red|green)_whitecell(_lead)?$/.test(normalizedRole)) {
        return 1;
    }
    if (/^(blue|red|green)_whitecell_support$/.test(normalizedRole)) {
        return 1;
    }
    if (normalizedRole === 'white') {
        return 1;
    }

    return null;
}

function releaseStaleSessionRoleSeats(state, sessionId, timeoutSeconds = 90) {
    const cutoff = Date.now() - (Math.max(timeoutSeconds, 1) * 1000);
    let releasedCount = 0;

    state.tables.session_participants = state.tables.session_participants.map((seat) => {
        if (seat.session_id !== sessionId || seat.is_active !== true) {
            return seat;
        }

        const lastSeen = new Date(seat.heartbeat_at || seat.last_seen || seat.joined_at || 0).getTime();
        if (Number.isNaN(lastSeen) || lastSeen >= cutoff) {
            return seat;
        }

        releasedCount += 1;
        return {
            ...seat,
            is_active: false,
            disconnected_at: seat.disconnected_at || getTimestamp(),
            left_at: seat.left_at || getTimestamp(),
            last_seen: seat.last_seen || seat.heartbeat_at || seat.joined_at || getTimestamp()
        };
    });

    return releasedCount;
}

function buildParticipantSeatPayload(state, seat) {
    if (!seat) {
        return null;
    }

    const participant = state.tables.participants.find((entry) => entry.id === seat.participant_id);

    return {
        ...cloneValue(seat),
        display_name: participant?.name ?? 'Unknown',
        client_id: participant?.client_id ?? null
    };
}

function claimSessionRoleSeat(state, {
    requested_session_id,
    requested_role,
    requested_name,
    requested_client_id,
    requested_timeout_seconds = 90
}) {
    const normalizedRole = normalizeSeatRole(String(requested_role || '').trim());
    const normalizedName = String(requested_name || '').trim() || null;
    const normalizedClientId = String(requested_client_id || '').trim();
    const roleLimit = getSessionRoleSeatLimit(normalizedRole);

    if (!requested_session_id) {
        return { data: null, error: { message: 'Session ID is required.' } };
    }
    if (!normalizedRole) {
        return { data: null, error: { message: 'Role is required.' } };
    }
    if (!normalizedClientId) {
        return { data: null, error: { message: 'Client identity is required.' } };
    }
    if (!roleLimit) {
        return { data: null, error: { message: 'This role cannot be claimed in the live demo.' } };
    }

    const session = state.tables.sessions.find((entry) => entry.id === requested_session_id);
    if (!session || session.status !== 'active') {
        return { data: null, error: { message: 'This session is not currently joinable.' } };
    }

    releaseStaleSessionRoleSeats(state, requested_session_id, requested_timeout_seconds);

    let participant = state.tables.participants.find((entry) => entry.client_id === normalizedClientId);
    if (!participant) {
        participant = normalizeInsertRow('participants', {
            client_id: normalizedClientId,
            name: normalizedName,
            role: normalizedRole
        }, state);
        state.tables.participants.push(participant);
    } else {
        participant = {
            ...participant,
            name: normalizedName ?? participant.name ?? null,
            role: normalizedRole,
            updated_at: getTimestamp()
        };
        state.tables.participants = state.tables.participants.map((entry) => (
            entry.id === participant.id ? participant : entry
        ));
    }

    const existingSeat = state.tables.session_participants.find((entry) => (
        entry.session_id === requested_session_id && entry.participant_id === participant.id
    )) || null;

    const activeClaimCount = state.tables.session_participants.filter((entry) => (
        entry.session_id === requested_session_id &&
        entry.role === normalizedRole &&
        entry.is_active === true &&
        (!existingSeat || entry.id !== existingSeat.id)
    )).length;

    if (activeClaimCount >= roleLimit) {
        return {
            data: null,
            error: { message: 'The requested role is full. Please choose another seat.' }
        };
    }

    let seat = existingSeat;
    let claimStatus = 'claimed';
    const now = getTimestamp();

    if (!seat) {
        seat = normalizeInsertRow('session_participants', {
            session_id: requested_session_id,
            participant_id: participant.id,
            role: normalizedRole,
            is_active: true,
            heartbeat_at: now,
            joined_at: now,
            last_seen: now,
            disconnected_at: null,
            left_at: null
        }, state);
        state.tables.session_participants.push(seat);
    } else {
        claimStatus = seat.is_active && seat.role === normalizedRole
            ? 'refreshed'
            : (seat.role === normalizedRole ? 'rejoined' : 'reassigned');
        seat = {
            ...seat,
            role: normalizedRole,
            is_active: true,
            heartbeat_at: now,
            last_seen: now,
            disconnected_at: null,
            left_at: null,
            updated_at: now
        };
        state.tables.session_participants = state.tables.session_participants.map((entry) => (
            entry.id === seat.id ? seat : entry
        ));
    }

    return {
        data: {
            ...buildParticipantSeatPayload(state, seat),
            seat_limit: roleLimit,
            active_count: activeClaimCount + 1,
            claim_status: claimStatus
        },
        error: null
    };
}

function heartbeatSessionRoleSeat(state, {
    requested_session_id,
    requested_session_participant_id,
    requested_client_id,
    requested_timeout_seconds = 90
}) {
    if (!requested_session_id || !requested_session_participant_id) {
        return {
            data: null,
            error: { message: 'A claimed seat is required to send heartbeats.' }
        };
    }

    releaseStaleSessionRoleSeats(state, requested_session_id, requested_timeout_seconds);

    const seat = state.tables.session_participants.find((entry) => (
        entry.id === requested_session_participant_id && entry.session_id === requested_session_id
    ));
    const participant = seat
        ? state.tables.participants.find((entry) => entry.id === seat.participant_id)
        : null;

    if (!seat || !participant || (requested_client_id && participant.client_id !== requested_client_id)) {
        return {
            data: null,
            error: { message: 'Participant seat not found. Please rejoin the session.' }
        };
    }

    if (seat.is_active !== true) {
        const roleLimit = getSessionRoleSeatLimit(seat.role) || 1;
        const activeClaimCount = state.tables.session_participants.filter((entry) => (
            entry.session_id === requested_session_id &&
            entry.role === seat.role &&
            entry.is_active === true &&
            entry.id !== seat.id
        )).length;

        if (activeClaimCount >= roleLimit) {
            return {
                data: null,
                error: { message: 'This seat is no longer available. Please rejoin the session.' }
            };
        }
    }

    const now = getTimestamp();
    const updatedSeat = {
        ...seat,
        is_active: true,
        heartbeat_at: now,
        last_seen: now,
        disconnected_at: null,
        left_at: null,
        updated_at: now
    };

    state.tables.session_participants = state.tables.session_participants.map((entry) => (
        entry.id === updatedSeat.id ? updatedSeat : entry
    ));

    return {
        data: buildParticipantSeatPayload(state, updatedSeat),
        error: null
    };
}

function disconnectSessionRoleSeat(state, {
    requested_session_id,
    requested_session_participant_id,
    requested_client_id,
    requested_timeout_seconds = 90
}) {
    if (!requested_session_id || !requested_session_participant_id) {
        return { data: null, error: null };
    }

    releaseStaleSessionRoleSeats(state, requested_session_id, requested_timeout_seconds);

    const seat = state.tables.session_participants.find((entry) => (
        entry.id === requested_session_participant_id && entry.session_id === requested_session_id
    ));
    const participant = seat
        ? state.tables.participants.find((entry) => entry.id === seat.participant_id)
        : null;

    if (!seat || !participant || (requested_client_id && participant.client_id !== requested_client_id)) {
        return { data: null, error: null };
    }

    const now = getTimestamp();
    const updatedSeat = {
        ...seat,
        is_active: false,
        disconnected_at: now,
        left_at: seat.left_at || now,
        last_seen: seat.last_seen || now,
        updated_at: now
    };

    state.tables.session_participants = state.tables.session_participants.map((entry) => (
        entry.id === updatedSeat.id ? updatedSeat : entry
    ));

    return {
        data: buildParticipantSeatPayload(state, updatedSeat),
        error: null
    };
}

function listActiveSessionParticipants(state, {
    requested_session_id,
    requested_timeout_seconds = 90
}) {
    if (!requested_session_id) {
        return { data: [], error: null };
    }

    releaseStaleSessionRoleSeats(state, requested_session_id, requested_timeout_seconds);

    return {
        data: state.tables.session_participants
            .filter((entry) => entry.session_id === requested_session_id && entry.is_active === true)
            .map((entry) => buildParticipantSeatPayload(state, entry)),
        error: null
    };
}

class MockQueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.operation = 'select';
        this.selectClause = '*';
        this.filters = [];
        this.orderBy = null;
        this.limitCount = null;
        this.singleMode = null;
        this.payload = null;
        this.returning = false;
    }

    select(selectClause = '*') {
        this.selectClause = selectClause;
        this.returning = true;
        return this;
    }

    insert(payload) {
        this.operation = 'insert';
        this.payload = Array.isArray(payload) ? payload : [payload];
        return this;
    }

    update(payload) {
        this.operation = 'update';
        this.payload = cloneValue(payload);
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    eq(field, value) {
        this.filters.push((row) => compareValues(row?.[field], value));
        return this;
    }

    gt(field, value) {
        this.filters.push((row) => {
            const fieldValue = row?.[field];
            if (fieldValue === undefined || fieldValue === null) {
                return false;
            }

            return fieldValue > value;
        });
        return this;
    }

    in(field, values) {
        const allowedValues = Array.isArray(values) ? values : [];
        this.filters.push((row) => allowedValues.includes(row?.[field]));
        return this;
    }

    order(field, { ascending = true } = {}) {
        this.orderBy = { field, ascending };
        return this;
    }

    limit(limitCount) {
        this.limitCount = limitCount;
        return this;
    }

    single() {
        this.singleMode = 'single';
        return this.execute();
    }

    maybeSingle() {
        this.singleMode = 'maybeSingle';
        return this.execute();
    }

    then(resolve, reject) {
        return this.execute().then(resolve, reject);
    }

    async execute() {
        const state = readMockState();
        const tableRows = state.tables[this.tableName];

        if (!tableRows) {
            return {
                data: null,
                error: {
                    code: 'MOCK404',
                    message: `Mock table not found: ${this.tableName}`
                }
            };
        }

        let rows = tableRows;

        if (this.operation === 'insert') {
            const insertedRows = this.payload.map((entry) => normalizeInsertRow(this.tableName, entry, state));
            state.tables[this.tableName] = [...tableRows, ...insertedRows];
            writeMockState(state);
            rows = insertedRows;
        } else if (this.operation === 'update') {
            const timestamp = getTimestamp();
            const updatedRows = [];

            state.tables[this.tableName] = tableRows.map((row) => {
                if (!applyFilters([row], this.filters).length) {
                    return row;
                }

                const nextRow = {
                    ...row,
                    ...cloneValue(this.payload),
                    updated_at: this.payload?.updated_at || timestamp
                };

                if ('last_updated' in row || this.tableName === 'game_state') {
                    nextRow.last_updated = this.payload?.last_updated || timestamp;
                }

                updatedRows.push(nextRow);
                return nextRow;
            });

            writeMockState(state);
            rows = updatedRows;
        } else if (this.operation === 'delete') {
            const deletedRows = applyFilters(tableRows, this.filters);
            state.tables[this.tableName] = tableRows.filter((row) => !applyFilters([row], this.filters).length);
            writeMockState(state);
            rows = deletedRows;
        } else {
            rows = applyFilters(tableRows, this.filters);
        }

        rows = sortRows(rows, this.orderBy);
        if (typeof this.limitCount === 'number') {
            rows = rows.slice(0, this.limitCount);
        }

        rows = shapeSelectedRows(this.tableName, rows, this.selectClause, state);

        if (this.singleMode === 'single') {
            if (rows.length !== 1) {
                return {
                    data: null,
                    error: {
                        code: 'PGRST116',
                        message: rows.length === 0
                            ? 'No rows returned'
                            : 'Multiple rows returned'
                    }
                };
            }

            return {
                data: rows[0],
                error: null
            };
        }

        if (this.singleMode === 'maybeSingle') {
            if (rows.length === 0) {
                return { data: null, error: null };
            }

            if (rows.length > 1) {
                return {
                    data: null,
                    error: {
                        code: 'PGRST116',
                        message: 'Multiple rows returned'
                    }
                };
            }

            return {
                data: rows[0],
                error: null
            };
        }

        return {
            data: rows,
            error: null
        };
    }
}

export function isE2EMockEnabled() {
    if (typeof globalThis === 'undefined') {
        return false;
    }

    if (globalThis.__ESG_E2E_MOCK__ === true) {
        return true;
    }

    const storage = getStorage();
    return storage?.getItem(E2E_MOCK_FLAG_KEY) === 'enabled';
}

export function resetE2EMockState() {
    writeMockState(buildInitialMockState());
    writeMockAuthSession(null);
}

export function createE2EMockSupabaseClient() {
    if (typeof globalThis !== 'undefined') {
        globalThis.__ESG_E2E_BACKEND__ = {
            reset: resetE2EMockState,
            dump: () => cloneValue(readMockState())
        };
    }

    return {
        from(tableName) {
            return new MockQueryBuilder(tableName);
        },
        channel() {
            return {
                on() {
                    return this;
                },
                subscribe() {
                    return this;
                },
                unsubscribe() {}
            };
        },
        rpc: async (functionName, params = {}) => {
            if (functionName === 'lookup_joinable_session_by_code') {
                const normalizedCode = String(params?.requested_code || '').trim().toUpperCase();
                const state = readMockState();
                const session = (state.tables.sessions || []).find((entry) => {
                    const resolvedCode = String(entry.session_code || entry.metadata?.session_code || '')
                        .trim()
                        .toUpperCase();
                    return resolvedCode === normalizedCode;
                });

                if (!session) {
                    return {
                        data: null,
                        error: {
                            message: 'Session not found. Please check the code and try again.'
                        }
                    };
                }

                if (session.status !== 'active') {
                    return {
                        data: null,
                        error: {
                            message: 'This session is not currently joinable.'
                        }
                    };
                }

                return {
                    data: {
                        id: session.id,
                        name: session.name,
                        session_code: session.session_code || session.metadata?.session_code || normalizedCode,
                        status: session.status
                    },
                    error: null
                };
            }

            if (functionName === 'claim_session_role_seat') {
                const state = readMockState();
                const result = claimSessionRoleSeat(state, params);
                writeMockState(state);
                return result;
            }

            if (functionName === 'heartbeat_session_role_seat') {
                const state = readMockState();
                const result = heartbeatSessionRoleSeat(state, params);
                writeMockState(state);
                return result;
            }

            if (functionName === 'disconnect_session_role_seat') {
                const state = readMockState();
                const result = disconnectSessionRoleSeat(state, params);
                writeMockState(state);
                return result;
            }

            if (functionName === 'release_stale_session_role_seats') {
                const state = readMockState();
                const released = releaseStaleSessionRoleSeats(
                    state,
                    params?.requested_session_id,
                    params?.requested_timeout_seconds ?? 90
                );
                writeMockState(state);
                return {
                    data: released,
                    error: null
                };
            }

            if (functionName === 'list_active_session_participants') {
                const state = readMockState();
                const result = listActiveSessionParticipants(state, params);
                writeMockState(state);
                return result;
            }

            return { data: null, error: null };
        },
        auth: {
            async getSession() {
                const session = readMockAuthSession();
                return {
                    data: { session },
                    error: null
                };
            },
            async signInAnonymously(credentials = {}) {
                const timestamp = Date.now();
                const session = {
                    access_token: `mock_access_${timestamp}`,
                    refresh_token: `mock_refresh_${timestamp}`,
                    expires_at: Math.floor(timestamp / 1000) + 3600,
                    token_type: 'bearer',
                    user: {
                        id: `anon_${timestamp}`,
                        is_anonymous: true,
                        user_metadata: cloneValue(credentials?.options?.data || {})
                    }
                };

                writeMockAuthSession(session);

                return {
                    data: {
                        session,
                        user: session.user
                    },
                    error: null
                };
            }
        }
    };
}
