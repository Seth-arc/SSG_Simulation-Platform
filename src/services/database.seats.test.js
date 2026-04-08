import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

async function loadModules() {
    vi.resetModules();
    globalThis.__ESG_E2E_MOCK__ = true;

    const [{ sessionStore }, { database }] = await Promise.all([
        import('../stores/session.js'),
        import('./database.js')
    ]);

    return {
        sessionStore,
        database
    };
}

function setClientIdentity(sessionStore, clientId, { resetAuth = true } = {}) {
    sessionStore.clearAll();
    if (resetAuth) {
        vi.setSystemTime(new Date(Date.now() + 1));
        localStorage.removeItem('esg_e2e_auth_session');
    }
    localStorage.setItem('esg_client_id', clientId);
    sessionStore.init();
}

describe('database live-demo seat contract', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-08T10:00:00.000Z'));
        global.localStorage = new MemoryStorage();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.resetModules();
        delete global.localStorage;
        delete globalThis.__ESG_E2E_MOCK__;
        delete globalThis.__ESG_E2E_BACKEND__;
    });

    it('claims a seat successfully through the server-side RPC flow', async () => {
        const { sessionStore, database } = await loadModules();
        setClientIdentity(sessionStore, 'client-seat-a');
        await database.authorizeOperatorAccess({
            surface: 'gamemaster',
            accessCode: 'admin2025',
            operatorName: 'GM Test'
        });

        const session = await database.createSession({
            name: 'Seat Claim Session',
            session_code: 'SEAT2026'
        });

        const seat = await database.claimParticipantSeat(session.id, 'blue_facilitator', 'Morgan');

        expect(seat).toMatchObject({
            session_id: session.id,
            role: 'blue_facilitator',
            display_name: 'Morgan',
            client_id: 'client-seat-a',
            claim_status: 'claimed',
            seat_limit: 1,
            active_count: 1,
            is_active: true
        });

        const activeParticipants = await database.getActiveParticipants(session.id);
        expect(activeParticipants).toHaveLength(1);
        expect(activeParticipants[0]).toMatchObject({
            id: seat.id,
            role: 'blue_facilitator',
            display_name: 'Morgan'
        });
    });

    it('allows an initial public seat claim without prior session access while keeping protected participant RPCs locked down', async () => {
        const { sessionStore, database } = await loadModules();
        setClientIdentity(sessionStore, 'client-operator');
        await database.authorizeOperatorAccess({
            surface: 'gamemaster',
            accessCode: 'admin2025',
            operatorName: 'GM Test'
        });

        const session = await database.createSession({
            name: 'Guarded Participant Session',
            session_code: 'GUARD2026'
        });

        setClientIdentity(sessionStore, 'client-public-a');

        await expect(
            database.releaseStaleParticipantSeats(session.id)
        ).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'Session access is required.'
        });

        await expect(
            database.getActiveParticipants(session.id)
        ).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'Session access is required.'
        });

        const claimedSeat = await database.claimParticipantSeat(session.id, 'blue_facilitator', 'Morgan');
        expect(claimedSeat).toMatchObject({
            session_id: session.id,
            role: 'blue_facilitator',
            display_name: 'Morgan',
            client_id: 'client-public-a',
            claim_status: 'claimed',
            is_active: true
        });

        await expect(database.getActiveParticipants(session.id)).resolves.toEqual([
            expect.objectContaining({
                id: claimedSeat.id,
                role: 'blue_facilitator',
                display_name: 'Morgan'
            })
        ]);

        setClientIdentity(sessionStore, 'client-public-b');

        await expect(
            database.getActiveParticipants(session.id)
        ).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'Session access is required.'
        });
    });

    it('rejects duplicate claims when the seat is already full', async () => {
        const { sessionStore, database } = await loadModules();
        setClientIdentity(sessionStore, 'client-seat-a');
        await database.authorizeOperatorAccess({
            surface: 'gamemaster',
            accessCode: 'admin2025',
            operatorName: 'GM Test'
        });

        const session = await database.createSession({
            name: 'Duplicate Claim Session',
            session_code: 'DUPL2026'
        });

        await database.claimParticipantSeat(session.id, 'blue_facilitator', 'Morgan');

        setClientIdentity(sessionStore, 'client-seat-b');

        await expect(
            database.claimParticipantSeat(session.id, 'blue_facilitator', 'Taylor')
        ).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'The requested role is full. Please choose another seat.'
        });
    });

    it('releases stale seats automatically before a new claim is evaluated', async () => {
        const { sessionStore, database } = await loadModules();
        setClientIdentity(sessionStore, 'client-stale-a');
        await database.authorizeOperatorAccess({
            surface: 'gamemaster',
            accessCode: 'admin2025',
            operatorName: 'GM Test'
        });

        const session = await database.createSession({
            name: 'Stale Seat Session',
            session_code: 'STALE2026'
        });

        const staleSeat = await database.claimParticipantSeat(session.id, 'blue_facilitator', 'Morgan');
        expect(staleSeat.is_active).toBe(true);

        vi.setSystemTime(new Date('2026-04-08T10:02:00.000Z'));
        setClientIdentity(sessionStore, 'client-stale-b');

        const replacementSeat = await database.claimParticipantSeat(session.id, 'blue_facilitator', 'Taylor');
        expect(replacementSeat).toMatchObject({
            role: 'blue_facilitator',
            display_name: 'Taylor',
            client_id: 'client-stale-b',
            active_count: 1
        });

        const activeParticipants = await database.getActiveParticipants(session.id);
        expect(activeParticipants).toHaveLength(1);
        expect(activeParticipants[0]).toMatchObject({
            id: replacementSeat.id,
            display_name: 'Taylor'
        });
    });

    it('disconnects a claimed seat and lets the same client rejoin it', async () => {
        const { sessionStore, database } = await loadModules();
        setClientIdentity(sessionStore, 'client-rejoin-a');
        await database.authorizeOperatorAccess({
            surface: 'gamemaster',
            accessCode: 'admin2025',
            operatorName: 'GM Test'
        });

        const session = await database.createSession({
            name: 'Disconnect Session',
            session_code: 'DISC2026'
        });

        const claimedSeat = await database.claimParticipantSeat(session.id, 'blue_notetaker', 'Jordan');
        const disconnectedSeat = await database.disconnectParticipant(session.id, claimedSeat.id);

        expect(disconnectedSeat).toMatchObject({
            id: claimedSeat.id,
            is_active: false
        });
        expect(await database.getActiveParticipants(session.id)).toEqual([]);

        const rejoinedSeat = await database.claimParticipantSeat(session.id, 'blue_notetaker', 'Jordan');
        expect(rejoinedSeat).toMatchObject({
            id: claimedSeat.id,
            role: 'blue_notetaker',
            display_name: 'Jordan',
            claim_status: 'rejoined',
            is_active: true
        });
    });
});
