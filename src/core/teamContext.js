import { buildAppPath, getCurrentAppRelativePath } from './navigation.js';

/**
 * Team and role surface helpers
 * Centralizes the shipped multi-team routing contract.
 */

export const ROLE_SURFACES = Object.freeze({
    FACILITATOR: 'facilitator',
    NOTETAKER: 'notetaker',
    WHITECELL: 'whitecell',
    VIEWER: 'viewer'
});

export const WHITE_CELL_OPERATOR_ROLES = Object.freeze({
    LEAD: 'lead',
    SUPPORT: 'support'
});

export const PUBLIC_ROLE_SURFACES = Object.freeze([
    ROLE_SURFACES.FACILITATOR,
    ROLE_SURFACES.NOTETAKER,
    ROLE_SURFACES.VIEWER
]);

export const OPERATOR_SURFACES = Object.freeze({
    GAME_MASTER: 'gamemaster',
    WHITE_CELL: ROLE_SURFACES.WHITECELL
});

export const TEAM_OPTIONS = Object.freeze([
    { id: 'blue', label: 'Blue Team', shortLabel: 'Blue' },
    { id: 'red', label: 'Red Team', shortLabel: 'Red' },
    { id: 'green', label: 'Green Team', shortLabel: 'Green' }
]);

const TEAM_MAP = Object.freeze(
    Object.fromEntries(TEAM_OPTIONS.map((team) => [team.id, team]))
);

export function getTeamConfig(teamId = 'blue') {
    return TEAM_MAP[teamId] || TEAM_MAP.blue;
}

export function isSupportedTeam(teamId) {
    return Boolean(TEAM_MAP[teamId]);
}

export function isPublicRoleSurface(surface = '') {
    return PUBLIC_ROLE_SURFACES.includes(surface);
}

export function isOperatorSurface(surface = '') {
    return Object.values(OPERATOR_SURFACES).includes(surface);
}

export function buildTeamRole(teamId, surface) {
    if (surface === ROLE_SURFACES.VIEWER) {
        return 'viewer';
    }

    if (surface === ROLE_SURFACES.WHITECELL) {
        return buildWhiteCellOperatorRole(teamId, WHITE_CELL_OPERATOR_ROLES.LEAD);
    }

    const team = getTeamConfig(teamId);
    return `${team.id}_${surface}`;
}

export function buildWhiteCellOperatorRole(teamId, operatorRole = WHITE_CELL_OPERATOR_ROLES.LEAD) {
    const team = getTeamConfig(teamId);
    const normalizedOperatorRole = operatorRole === WHITE_CELL_OPERATOR_ROLES.SUPPORT
        ? WHITE_CELL_OPERATOR_ROLES.SUPPORT
        : WHITE_CELL_OPERATOR_ROLES.LEAD;

    return `${team.id}_${ROLE_SURFACES.WHITECELL}_${normalizedOperatorRole}`;
}

export function isWhiteCellOperatorRole(role = '') {
    return /^(blue|red|green)_whitecell(?:_(lead|support))?$/.test(role);
}

export function normalizeWhiteCellOperatorRole(role = '') {
    if (typeof role !== 'string') {
        return role ?? null;
    }

    const match = role.match(/^(blue|red|green)_whitecell(?:_(lead|support))?$/);
    if (!match) {
        return role;
    }

    return buildWhiteCellOperatorRole(
        match[1],
        match[2] || WHITE_CELL_OPERATOR_ROLES.LEAD
    );
}

export function parseTeamRole(role = '') {
    if (typeof role !== 'string') {
        return {
            teamId: null,
            surface: null,
            operatorRole: null
        };
    }

    if (role === 'viewer') {
        return {
            teamId: null,
            surface: ROLE_SURFACES.VIEWER,
            operatorRole: null
        };
    }

    const match = role.match(/^(blue|red|green)_(facilitator|notetaker|whitecell)(?:_(lead|support))?$/);
    if (!match) {
        return {
            teamId: null,
            surface: null,
            operatorRole: null
        };
    }

    return {
        teamId: match[1],
        surface: match[2],
        operatorRole: match[2] === ROLE_SURFACES.WHITECELL
            ? (match[3] || WHITE_CELL_OPERATOR_ROLES.LEAD)
            : null
    };
}

export function getTeamRoleLabels(teamId) {
    const team = getTeamConfig(teamId);

    return {
        team: team.label,
        facilitator: `${team.label} Facilitator`,
        notetaker: `${team.label} Notetaker`,
        whitecell: `${team.label} White Cell`,
        whitecellLead: `${team.label} White Cell Lead`,
        whitecellSupport: `${team.label} White Cell Support`,
        observer: `${team.label} Observer`
    };
}

export function buildTeamRoute(teamId, surface, { observer = false, basePath } = {}) {
    const team = getTeamConfig(teamId);
    const pageSurface = surface === ROLE_SURFACES.VIEWER
        ? ROLE_SURFACES.FACILITATOR
        : surface;

    const route = buildAppPath(`teams/${team.id}/${pageSurface}.html`, { basePath });
    return observer ? `${route}?mode=observer` : route;
}

export function getRoleRoute(role, { observerTeamId = 'blue', basePath } = {}) {
    if (role === 'viewer') {
        return buildTeamRoute(observerTeamId, ROLE_SURFACES.FACILITATOR, { observer: true, basePath });
    }

    const parsedRole = parseTeamRole(role);
    if (!parsedRole.teamId || !parsedRole.surface) {
        return null;
    }

    return buildTeamRoute(parsedRole.teamId, parsedRole.surface, { basePath });
}

export function getRoleDisplayName(role, { observerTeamId = null } = {}) {
    if (role === 'white') {
        return 'Game Master';
    }

    if (role === 'viewer') {
        return observerTeamId ? `${getTeamConfig(observerTeamId).label} Observer` : 'Observer';
    }

    const parsedRole = parseTeamRole(role);
    if (!parsedRole.teamId || !parsedRole.surface) {
        return role || '';
    }

    if (parsedRole.surface === ROLE_SURFACES.WHITECELL) {
        const labels = getTeamRoleLabels(parsedRole.teamId);
        return parsedRole.operatorRole === WHITE_CELL_OPERATOR_ROLES.SUPPORT
            ? labels.whitecellSupport
            : labels.whitecellLead;
    }

    return getTeamRoleLabels(parsedRole.teamId)[parsedRole.surface] || role;
}

export function getTeamResponseTargets(teamId) {
    return new Set([
        'all',
        teamId,
        buildTeamRole(teamId, ROLE_SURFACES.FACILITATOR)
    ]);
}

export function resolveTeamContext({
    documentRef = typeof document !== 'undefined' ? document : null,
    locationRef = typeof window !== 'undefined' ? window.location : null,
    fallbackTeamId = 'blue',
    basePath
} = {}) {
    const datasetTeam = documentRef?.body?.dataset?.team;
    const relativePath = getCurrentAppRelativePath({ locationRef, basePath });
    const routeTeam = relativePath.match(/^teams\/(blue|red|green)\//)?.[1];
    const team = getTeamConfig(datasetTeam || routeTeam || fallbackTeamId);
    const labels = getTeamRoleLabels(team.id);

    return {
        teamId: team.id,
        teamLabel: team.label,
        teamShortLabel: team.shortLabel,
        facilitatorRole: buildTeamRole(team.id, ROLE_SURFACES.FACILITATOR),
        notetakerRole: buildTeamRole(team.id, ROLE_SURFACES.NOTETAKER),
        whitecellRole: buildTeamRole(team.id, ROLE_SURFACES.WHITECELL),
        whitecellLeadRole: buildWhiteCellOperatorRole(team.id, WHITE_CELL_OPERATOR_ROLES.LEAD),
        whitecellSupportRole: buildWhiteCellOperatorRole(team.id, WHITE_CELL_OPERATOR_ROLES.SUPPORT),
        observerRole: 'viewer',
        facilitatorLabel: labels.facilitator,
        notetakerLabel: labels.notetaker,
        whitecellLabel: labels.whitecell,
        whitecellLeadLabel: labels.whitecellLead,
        whitecellSupportLabel: labels.whitecellSupport,
        observerLabel: labels.observer,
        facilitatorRoute: buildTeamRoute(team.id, ROLE_SURFACES.FACILITATOR, { basePath }),
        notetakerRoute: buildTeamRoute(team.id, ROLE_SURFACES.NOTETAKER, { basePath }),
        whitecellRoute: buildTeamRoute(team.id, ROLE_SURFACES.WHITECELL, { basePath }),
        observerRoute: buildTeamRoute(team.id, ROLE_SURFACES.FACILITATOR, { observer: true, basePath })
    };
}
