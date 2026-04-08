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
        expect(html).toContain('operatorWhiteCellLeadBtn');
        expect(html).toContain('operatorWhiteCellSupportBtn');
        expect(html).toContain('operatorGameMasterBtn');
    });

    it('renders a boot-loader simulation selector for Fractured Order', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(html).toContain('bootSimulationSelector');
        expect(html).toContain('aria-label="Simulation selection"');
        expect(html).toContain('data-simulation="fractured-order"');
        expect(html).toContain('bootFracturedOrderOption');
    });

    it('contains the operator password field inside a form', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(html).toContain('id="operatorAccessForm"');
        expect(html).toContain('id="operatorAccessCode"');
    });
});
