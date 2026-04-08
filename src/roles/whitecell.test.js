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

    it('keeps the visible participant roster scoped to the current team roles', async () => {
        const { buildWhiteCellParticipantRoster } = await loadWhiteCellModule();

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
        ], 'blue');

        expect(roster.map((participant) => participant.id)).toEqual([
            'blue-facilitator',
            'blue-whitecell',
            'observer-1'
        ]);
    });
});
