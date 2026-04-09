import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const WHITECELL_HTML_PATH = new URL('../../teams/blue/whitecell.html', import.meta.url);

function extractIdsFromHtml(html) {
    return new Set(
        [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1])
    );
}

function createFakeElement(id) {
    return {
        id,
        value: '',
        textContent: '',
        listeners: {},
        classList: {
            add() {},
            remove() {},
            toggle() {}
        },
        addEventListener(type, callback) {
            this.listeners[type] = callback;
        }
    };
}

function createFakeDocument(ids = []) {
    const elements = Object.fromEntries(ids.map((id) => [id, createFakeElement(id)]));

    return {
        elements,
        getElementById(id) {
            return elements[id] || null;
        }
    };
}

async function loadWhiteCellModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./whitecell.js');
}

describe('White Cell DOM contract', () => {
    afterEach(() => {
        vi.resetModules();
        delete global.document;
        delete global.window;
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
    });

    it('matches the rendered White Cell HTML ids', async () => {
        const html = readFileSync(WHITECELL_HTML_PATH, 'utf8');
        const htmlIds = extractIdsFromHtml(html);
        const { WHITE_CELL_DOM_IDS } = await loadWhiteCellModule();

        expect(WHITE_CELL_DOM_IDS.filter((id) => !htmlIds.has(id))).toEqual([]);
    });

    it('binds the shipped White Cell controls to controller handlers', async () => {
        const { WHITE_CELL_DOM_IDS, WhiteCellController, getWhiteCellDomContract } = await loadWhiteCellModule();
        const fakeDocument = createFakeDocument(WHITE_CELL_DOM_IDS);
        global.document = fakeDocument;

        const controller = new WhiteCellController();
        controller.startTimer = vi.fn();
        controller.pauseTimer = vi.fn();
        controller.resetTimer = vi.fn();
        controller.regressPhase = vi.fn();
        controller.advancePhase = vi.fn();
        controller.regressMove = vi.fn();
        controller.advanceMove = vi.fn();
        controller.handleCommunicationSubmit = vi.fn();

        controller.bindEventListeners();

        expect(getWhiteCellDomContract(fakeDocument).missing).toEqual([]);

        fakeDocument.elements.startTimerBtn.listeners.click();
        fakeDocument.elements.pauseTimerBtn.listeners.click();
        fakeDocument.elements.resetTimerBtn.listeners.click();
        fakeDocument.elements.prevPhaseBtn.listeners.click();
        fakeDocument.elements.nextPhaseBtn.listeners.click();
        fakeDocument.elements.prevMoveBtn.listeners.click();
        fakeDocument.elements.nextMoveBtn.listeners.click();
        fakeDocument.elements.commForm.listeners.submit({
            preventDefault() {},
            currentTarget: fakeDocument.elements.commForm
        });

        expect(controller.startTimer).toHaveBeenCalledTimes(1);
        expect(controller.pauseTimer).toHaveBeenCalledTimes(1);
        expect(controller.resetTimer).toHaveBeenCalledTimes(1);
        expect(controller.regressPhase).toHaveBeenCalledTimes(1);
        expect(controller.advancePhase).toHaveBeenCalledTimes(1);
        expect(controller.regressMove).toHaveBeenCalledTimes(1);
        expect(controller.advanceMove).toHaveBeenCalledTimes(1);
        expect(controller.handleCommunicationSubmit).toHaveBeenCalledTimes(1);
    });

    it('blocks access without a matching operator grant and enforces team/session scope', async () => {
        const { getWhiteCellAccessState } = await loadWhiteCellModule();
        const teamContext = {
            teamId: 'blue',
            whitecellLeadRole: 'blue_whitecell_lead',
            whitecellSupportRole: 'blue_whitecell_support'
        };

        expect(getWhiteCellAccessState(teamContext, {
            getSessionId: () => 'session-1',
            getSessionData: () => ({ role: 'blue_whitecell_lead' }),
            getRole: () => 'blue_whitecell_lead',
            hasOperatorAccess: () => false
        })).toMatchObject({
            allowed: true,
            cachedOperatorAccess: false,
            sessionId: 'session-1',
            role: 'blue_whitecell_lead',
            operatorRole: 'lead'
        });

        const hasOperatorAccess = vi.fn(() => true);

        expect(getWhiteCellAccessState(teamContext, {
            getSessionId: () => 'session-1',
            getSessionData: () => ({ role: 'blue_whitecell_support' }),
            getRole: () => 'blue_whitecell_support',
            hasOperatorAccess
        })).toMatchObject({
            allowed: true,
            cachedOperatorAccess: true,
            sessionId: 'session-1',
            role: 'blue_whitecell_support',
            operatorRole: 'support'
        });

        expect(hasOperatorAccess).toHaveBeenCalledWith('whitecell', {
            sessionId: 'session-1',
            teamId: 'blue',
            role: 'blue_whitecell_support'
        });
    });

    it('includes all team seats in the White Cell participant roster while excluding Game Master', async () => {
        const { buildWhiteCellParticipantRoster, formatWhiteCellParticipantSummary } = await loadWhiteCellModule();

        const roster = buildWhiteCellParticipantRoster([
            {
                id: 'blue-facilitator',
                role: 'blue_facilitator',
                display_name: 'Alex',
                is_active: true,
                heartbeat_at: '2026-04-08T10:05:00.000Z'
            },
            {
                id: 'red-facilitator',
                role: 'red_facilitator',
                display_name: 'Priya',
                is_active: true,
                heartbeat_at: '2026-04-08T10:06:00.000Z'
            },
            {
                id: 'green-notetaker',
                role: 'green_notetaker',
                display_name: 'Chris',
                is_active: true,
                heartbeat_at: '2026-04-08T10:03:00.000Z'
            },
            {
                id: 'blue-whitecell',
                role: 'blue_whitecell_support',
                display_name: 'Morgan',
                is_active: true,
                heartbeat_at: '2026-04-08T10:04:00.000Z'
            },
            {
                id: 'observer-1',
                role: 'viewer',
                display_name: 'Observer One',
                is_active: false,
                heartbeat_at: '2026-04-08T09:55:00.000Z'
            },
            {
                id: 'gamemaster',
                role: 'white',
                display_name: 'Game Master',
                is_active: true,
                heartbeat_at: '2026-04-08T10:07:00.000Z'
            }
        ]);

        expect(roster.map((participant) => participant.id)).toEqual([
            'red-facilitator',
            'blue-facilitator',
            'blue-whitecell',
            'green-notetaker',
            'observer-1'
        ]);
        expect(formatWhiteCellParticipantSummary(roster)).toBe('4 connected / 5 total participants');
    });

    it('builds cross-team White Cell communication recipients', async () => {
        const { buildWhiteCellCommunicationRecipientOptions } = await loadWhiteCellModule();

        expect(buildWhiteCellCommunicationRecipientOptions()).toEqual(expect.arrayContaining([
            { value: 'all', label: 'All Teams' },
            { value: 'blue', label: 'Blue Team' },
            { value: 'red', label: 'Red Team' },
            { value: 'green', label: 'Green Team' },
            { value: 'blue_facilitator', label: 'Blue Team Facilitator' },
            { value: 'red_notetaker', label: 'Red Team Notetaker' },
            { value: 'green_facilitator', label: 'Green Team Facilitator' }
        ]));
    });

    it('builds participant team and role filters from the live roster', async () => {
        const { buildWhiteCellParticipantFilterOptions } = await loadWhiteCellModule();

        const { teamOptions, roleOptions } = buildWhiteCellParticipantFilterOptions([
            { id: 'blue-facilitator', role: 'blue_facilitator' },
            { id: 'green-notetaker', role: 'green_notetaker' },
            { id: 'whitecell-seat', role: 'red_whitecell_support' },
            { id: 'observer-1', role: 'viewer' }
        ]);

        expect(teamOptions).toEqual(expect.arrayContaining([
            { value: '', label: 'All Teams' },
            { value: 'blue', label: 'Blue Team' },
            { value: 'green', label: 'Green Team' },
            { value: 'red', label: 'Red Team' },
            { value: 'observer', label: 'Observers' }
        ]));
        expect(roleOptions).toEqual(expect.arrayContaining([
            { value: '', label: 'All Roles' },
            { value: 'facilitator', label: 'Facilitators' },
            { value: 'notetaker', label: 'Notetakers' },
            { value: 'whitecell', label: 'White Cell' },
            { value: 'viewer', label: 'Observers' }
        ]));
    });

    it('filters live participants and timeline events by selected teams and roles', async () => {
        const {
            buildWhiteCellParticipantRoster,
            buildWhiteCellTimelineFilterOptions,
            filterWhiteCellParticipants,
            filterWhiteCellTimelineEvents
        } = await loadWhiteCellModule();

        const roster = buildWhiteCellParticipantRoster([
            { id: 'blue-facilitator', role: 'blue_facilitator', is_active: true },
            { id: 'green-notetaker', role: 'green_notetaker', is_active: true },
            { id: 'red-whitecell', role: 'red_whitecell_support', is_active: true },
            { id: 'observer-1', role: 'viewer', is_active: false }
        ]);

        expect(filterWhiteCellParticipants(roster, {
            team: 'green',
            role: 'notetaker'
        }).map((participant) => participant.id)).toEqual(['green-notetaker']);

        const timelineEvents = [
            {
                id: 'timeline-facilitator-action',
                team: 'blue',
                type: 'ACTION_CREATED',
                metadata: { role: 'blue_facilitator' }
            },
            {
                id: 'timeline-facilitator-capture',
                team: 'blue',
                type: 'NOTE',
                metadata: { role: 'blue_facilitator', actor: 'facilitator' }
            },
            {
                id: 'timeline-notetaker',
                team: 'green',
                type: 'QUOTE',
                metadata: { role: 'green_notetaker', actor: 'notetaker' }
            },
            {
                id: 'timeline-whitecell',
                team: 'white_cell',
                type: 'GUIDANCE',
                metadata: { role: 'red_whitecell_support' }
            }
        ];

        expect(filterWhiteCellTimelineEvents(timelineEvents, {
            team: 'blue',
            role: 'facilitator'
        }).map((event) => event.id)).toEqual([
            'timeline-facilitator-action',
            'timeline-facilitator-capture'
        ]);

        const { teamOptions, roleOptions } = buildWhiteCellTimelineFilterOptions(timelineEvents);
        expect(teamOptions).toEqual(expect.arrayContaining([
            { value: '', label: 'All Teams' },
            { value: 'blue', label: 'Blue Team' },
            { value: 'green', label: 'Green Team' },
            { value: 'white_cell', label: 'White Cell' }
        ]));
        expect(roleOptions).toEqual(expect.arrayContaining([
            { value: '', label: 'All Roles' },
            { value: 'facilitator', label: 'Facilitators' },
            { value: 'notetaker', label: 'Notetakers' },
            { value: 'whitecell', label: 'White Cell' }
        ]));
    });
});
