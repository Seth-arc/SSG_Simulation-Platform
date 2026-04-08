import { describe, expect, it } from 'vitest';

import {
    OPERATOR_SURFACES,
    PUBLIC_ROLE_SURFACES,
    ROLE_SURFACES,
    WHITE_CELL_OPERATOR_ROLES,
    buildTeamRole,
    buildWhiteCellOperatorRole,
    getRoleDisplayName,
    getRoleRoute,
    isOperatorSurface,
    isPublicRoleSurface,
    resolveTeamContext
} from './teamContext.js';

describe('teamContext', () => {
    it('builds team-scoped roles and routes for shipped teams', () => {
        expect(buildTeamRole('blue', ROLE_SURFACES.FACILITATOR)).toBe('blue_facilitator');
        expect(buildTeamRole('red', ROLE_SURFACES.NOTETAKER)).toBe('red_notetaker');
        expect(buildTeamRole('green', ROLE_SURFACES.WHITECELL)).toBe('green_whitecell_lead');
        expect(buildWhiteCellOperatorRole('green', WHITE_CELL_OPERATOR_ROLES.SUPPORT)).toBe('green_whitecell_support');

        expect(getRoleRoute('red_facilitator', { basePath: '/repo-slug/' })).toBe('/repo-slug/teams/red/facilitator.html');
        expect(getRoleRoute('green_whitecell_support', { basePath: '/repo-slug/' })).toBe('/repo-slug/teams/green/whitecell.html');
        expect(getRoleRoute('viewer', { observerTeamId: 'red', basePath: '/repo-slug/' })).toBe('/repo-slug/teams/red/facilitator.html?mode=observer');
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
            locationRef: { pathname: '/repo-slug/teams/blue/facilitator.html' },
            basePath: '/repo-slug/'
        });

        expect(context.teamId).toBe('green');
        expect(context.facilitatorRole).toBe('green_facilitator');
        expect(context.notetakerRoute).toBe('/repo-slug/teams/green/notetaker.html');
        expect(getRoleDisplayName('green_notetaker')).toBe('Green Team Notetaker');
        expect(getRoleDisplayName('green_whitecell_support')).toBe('Green Team White Cell Support');
        expect(getRoleDisplayName('viewer', { observerTeamId: 'green' })).toBe('Green Team Observer');
    });

    it('defines explicit public and operator surface boundaries', () => {
        expect(PUBLIC_ROLE_SURFACES).toEqual([
            ROLE_SURFACES.FACILITATOR,
            ROLE_SURFACES.NOTETAKER,
            ROLE_SURFACES.VIEWER
        ]);

        expect(isPublicRoleSurface(ROLE_SURFACES.WHITECELL)).toBe(false);
        expect(isPublicRoleSurface(ROLE_SURFACES.VIEWER)).toBe(true);
        expect(isOperatorSurface(OPERATOR_SURFACES.GAME_MASTER)).toBe(true);
        expect(isOperatorSurface(OPERATOR_SURFACES.WHITE_CELL)).toBe(true);
    });
});
