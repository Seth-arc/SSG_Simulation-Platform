import { describe, expect, it } from 'vitest';

import {
    ROLE_SURFACES,
    buildTeamRole,
    getRoleDisplayName,
    getRoleRoute,
    resolveTeamContext
} from './teamContext.js';

describe('teamContext', () => {
    it('builds team-scoped roles and routes for shipped teams', () => {
        expect(buildTeamRole('blue', ROLE_SURFACES.FACILITATOR)).toBe('blue_facilitator');
        expect(buildTeamRole('red', ROLE_SURFACES.NOTETAKER)).toBe('red_notetaker');
        expect(buildTeamRole('green', ROLE_SURFACES.WHITECELL)).toBe('green_whitecell');

        expect(getRoleRoute('red_facilitator')).toBe('/teams/red/facilitator.html');
        expect(getRoleRoute('green_whitecell')).toBe('/teams/green/whitecell.html');
        expect(getRoleRoute('viewer', { observerTeamId: 'red' })).toBe('/teams/red/facilitator.html?mode=observer');
    });

    it('resolves team context from page markup and formats role labels', () => {
        const documentRef = {
            body: {
                dataset: {
                    team: 'green'
                }
            }
        };

        const context = resolveTeamContext({
            documentRef,
            locationRef: { pathname: '/teams/blue/facilitator.html' }
        });

        expect(context.teamId).toBe('green');
        expect(context.facilitatorRole).toBe('green_facilitator');
        expect(context.notetakerRoute).toBe('/teams/green/notetaker.html');
        expect(getRoleDisplayName('green_notetaker')).toBe('Green Team Notetaker');
        expect(getRoleDisplayName('viewer', { observerTeamId: 'green' })).toBe('Green Team Observer');
    });
});
