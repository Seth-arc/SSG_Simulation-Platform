import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH = new URL(
    '../../data/2026-04-09_global_white_cell_role_contract.sql',
    import.meta.url
);

function extractFunctionBody(sql, functionName) {
    const functionPattern = new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?AS \\\$\\$([\\s\\S]*?)\\$\\$;`,
        'm'
    );
    const match = sql.match(functionPattern);

    expect(match, `Expected SQL contract for ${functionName} to exist.`).not.toBeNull();

    return match[1];
}

describe('database migration contracts', () => {
    it('keeps first-time public seat claims on the internal stale-seat cleanup helper', () => {
        const sql = readFileSync(GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH, 'utf8');
        const claimSessionRoleSeatBody = extractFunctionBody(sql, 'claim_session_role_seat');

        expect(claimSessionRoleSeatBody).toContain('release_stale_session_role_seats_internal');
        expect(claimSessionRoleSeatBody).not.toContain(
            'release_stale_session_role_seats(requested_session_id, normalized_timeout_seconds)'
        );
    });
});