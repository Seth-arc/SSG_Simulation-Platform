const E2E_MOCK_FLAG_KEY = 'esg_e2e_mock';
const E2E_MOCK_STATE_KEY = 'esg_e2e_backend_state';

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
        rpc: async () => ({ data: null, error: null }),
        auth: {
            async getSession() {
                return {
                    data: { session: null },
                    error: null
                };
            }
        }
    };
}
