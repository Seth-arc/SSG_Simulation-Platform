import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LANDING_HTML_PATH = new URL('../../index.html', import.meta.url);

function extractRoleSurfaces(html) {
    return [...html.matchAll(/data-role-surface="([^"]+)"/g)].map((match) => match[1]);
}

describe('landing public role visibility', () => {
    it('shows only public participant join roles and moves operator roles into operator access', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(extractRoleSurfaces(html)).toEqual([
            'facilitator',
            'notetaker',
            'viewer'
        ]);
        expect(html).not.toContain('data-role-surface="whitecell"');
        expect(html).toContain('Operator Access');
        expect(html).toContain('operatorWhiteCellBtn');
        expect(html).toContain('operatorGameMasterBtn');
    });
});
