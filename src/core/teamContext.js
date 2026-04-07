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

export function buildTeamRole(teamId, surface) {
    if (surface === ROLE_SURFACES.VIEWER) {
        return 'viewer';
    }

    const team = getTeamConfig(teamId);
    return `${team.id}_${surface}`;
}

export function parseTeamRole(role = '') {
    if (role === 'viewer') {
        return {
            teamId: null,
            surface: ROLE_SURFACES.VIEWER
        };
    }

    const match = role.match(/^(blue|red|green)_(facilitator|notetaker|whitecell)$/);
    if (!match) {
        return {
            teamId: null,
            surface: null
        };
    }

    return {
        teamId: match[1],
        surface: match[2]
    };
}

export function getTeamRoleLabels(teamId) {
    const team = getTeamConfig(teamId);

    return {
        team: team.label,
        facilitator: `${team.label} Facilitator`,
        notetaker: `${team.label} Notetaker`,
        whitecell: `${team.label} White Cell`,
        observer: `${team.label} Observer`
    };
}

export function buildTeamRoute(teamId, surface, { observer = false } = {}) {
    const team = getTeamConfig(teamId);
    const pageSurface = surface === ROLE_SURFACES.VIEWER
        ? ROLE_SURFACES.FACILITATOR
        : surface;

    const route = `/teams/${team.id}/${pageSurface}.html`;
    return observer ? `${route}?mode=observer` : route;
}

export function getRoleRoute(role, { observerTeamId = 'blue' } = {}) {
    if (role === 'viewer') {
        return buildTeamRoute(observerTeamId, ROLE_SURFACES.FACILITATOR, { observer: true });
    }

    const parsedRole = parseTeamRole(role);
    if (!parsedRole.teamId || !parsedRole.surface) {
        return null;
    }

    return buildTeamRoute(parsedRole.teamId, parsedRole.surface);
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
    fallbackTeamId = 'blue'
} = {}) {
    const datasetTeam = documentRef?.body?.dataset?.team;
    const routeTeam = locationRef?.pathname?.match(/\/teams\/(blue|red|green)\//)?.[1];
    const team = getTeamConfig(datasetTeam || routeTeam || fallbackTeamId);
    const labels = getTeamRoleLabels(team.id);

    return {
        teamId: team.id,
        teamLabel: team.label,
        teamShortLabel: team.shortLabel,
        facilitatorRole: buildTeamRole(team.id, ROLE_SURFACES.FACILITATOR),
        notetakerRole: buildTeamRole(team.id, ROLE_SURFACES.NOTETAKER),
        whitecellRole: buildTeamRole(team.id, ROLE_SURFACES.WHITECELL),
        observerRole: 'viewer',
        facilitatorLabel: labels.facilitator,
        notetakerLabel: labels.notetaker,
        whitecellLabel: labels.whitecell,
        observerLabel: labels.observer,
        facilitatorRoute: buildTeamRoute(team.id, ROLE_SURFACES.FACILITATOR),
        notetakerRoute: buildTeamRoute(team.id, ROLE_SURFACES.NOTETAKER),
        whitecellRoute: buildTeamRoute(team.id, ROLE_SURFACES.WHITECELL),
        observerRoute: buildTeamRoute(team.id, ROLE_SURFACES.FACILITATOR, { observer: true })
    };
}
