import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockSupabase,
    mockEnsureBrowserIdentity,
    mockSessionStore
} = vi.hoisted(() => ({
    mockSupabase: {
        rpc: vi.fn(),
        from: vi.fn()
    },
    mockEnsureBrowserIdentity: vi.fn(),
    mockSessionStore: {
        getClientId: vi.fn(() => 'client-join-test')
    }
}));

vi.mock('./supabase.js', () => ({
    supabase: mockSupabase,
    ensureBrowserIdentity: mockEnsureBrowserIdentity,
    getRuntimeConfigStatus: () => ({ ready: true })
}));

vi.mock('../stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

describe('database secure join lookup', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mockSessionStore.getClientId.mockReturnValue('client-join-test');
        mockEnsureBrowserIdentity.mockResolvedValue({
            access_token: 'anon-token'
        });
    });

    it('joins successfully by a valid code through the authenticated RPC', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: {
                id: 'session-1',
                name: 'Alpha Session',
                session_code: 'ALPHA2026',
                status: 'active',
                metadata: {
                    hidden: 'should-not-leak'
                }
            },
            error: null
        });

        const { database } = await import('./database.js');
        const session = await database.lookupJoinableSessionByCode(' alpha2026 ');

        expect(mockEnsureBrowserIdentity).toHaveBeenCalledWith({
            clientId: 'client-join-test'
        });
        expect(mockSupabase.rpc).toHaveBeenCalledWith('lookup_joinable_session_by_code', {
            requested_code: 'ALPHA2026'
        });
        expect(mockSupabase.from).not.toHaveBeenCalled();
        expect(session).toEqual({
            id: 'session-1',
            name: 'Alpha Session',
            session_code: 'ALPHA2026',
            status: 'active'
        });
    });

    it('fails cleanly for an invalid code without enumerating sessions', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: null,
            error: {
                message: 'Session not found. Please check the code and try again.'
            }
        });

        const { database } = await import('./database.js');

        await expect(database.lookupJoinableSessionByCode('missing-code')).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'Session not found. Please check the code and try again.'
        });

        expect(mockEnsureBrowserIdentity).toHaveBeenCalledWith({
            clientId: 'client-join-test'
        });
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });
});
