import { expect } from '@playwright/test';

import { dumpE2EMockBackend } from './mockBackend.js';

const SHARED_LOCAL_STORAGE_KEYS = Object.freeze([
    'esg_e2e_mock',
    'esg_e2e_backend_state',
    '__esg_e2e_backend_reset__'
]);

const BACKEND_RESET_KEY = '__esg_e2e_backend_reset__';

export const OPERATOR_ACCESS_CODE = 'admin2025';

export const DEFAULT_ACTION_PAYLOAD = Object.freeze({
    mechanism: 'export',
    sector: 'semiconductors',
    exposureType: 'Technology',
    priority: 'HIGH',
    targets: ['PRC', 'TWN'],
    expectedOutcomes: 'Reduce allied dependence and build leverage before the next move begins.',
    allyContingencies: 'Coordinate with allies first so enforcement and messaging remain aligned.'
});

function resolveExpectedUrlPattern(roleSurface) {
    if (roleSurface === 'notetaker') {
        return /notetaker\.html/;
    }

    if (roleSurface === 'viewer') {
        return /facilitator\.html\?mode=observer/;
    }

    return /facilitator\.html/;
}

function normalizeSessionCode(session = {}) {
    return String(session.session_code || session.metadata?.session_code || '')
        .trim()
        .toUpperCase();
}

export async function createIsolatedActorPage(context, actorName, { resetBackend = false } = {}) {
    const page = await context.newPage();

    await page.addInitScript(({
        actorName: isolatedActorName,
        resetBackend: shouldResetBackend,
        sharedKeys,
        backendResetKey
    }) => {
        const localStorageRef = globalThis.localStorage;
        const sharedKeySet = new Set(sharedKeys);
        const namespacePrefix = `actor:${isolatedActorName}::`;
        const storageProto = Storage.prototype;
        const originalGetItem = storageProto.getItem;
        const originalSetItem = storageProto.setItem;
        const originalRemoveItem = storageProto.removeItem;
        const originalClear = storageProto.clear;
        const originalKey = storageProto.key;

        const mapKey = (key) => {
            const normalizedKey = String(key);
            return sharedKeySet.has(normalizedKey)
                ? normalizedKey
                : `${namespacePrefix}${normalizedKey}`;
        };

        const collectNamespacedKeys = () => {
            const namespacedKeys = [];
            for (let index = 0; index < localStorageRef.length; index += 1) {
                const storedKey = originalKey.call(localStorageRef, index);
                if (storedKey?.startsWith(namespacePrefix)) {
                    namespacedKeys.push(storedKey);
                }
            }
            return namespacedKeys;
        };

        globalThis.__ESG_E2E_MOCK__ = true;
        globalThis.__ESG_E2E_ACTOR__ = isolatedActorName;
        originalSetItem.call(localStorageRef, 'esg_e2e_mock', 'enabled');

        if (shouldResetBackend && !originalGetItem.call(localStorageRef, backendResetKey)) {
            originalRemoveItem.call(localStorageRef, 'esg_e2e_backend_state');
            originalSetItem.call(localStorageRef, backendResetKey, 'true');
        }

        storageProto.getItem = function getItem(key) {
            if (this === localStorageRef) {
                return originalGetItem.call(this, mapKey(key));
            }

            return originalGetItem.call(this, key);
        };

        storageProto.setItem = function setItem(key, value) {
            if (this === localStorageRef) {
                return originalSetItem.call(this, mapKey(key), value);
            }

            return originalSetItem.call(this, key, value);
        };

        storageProto.removeItem = function removeItem(key) {
            if (this === localStorageRef) {
                return originalRemoveItem.call(this, mapKey(key));
            }

            return originalRemoveItem.call(this, key);
        };

        storageProto.clear = function clear() {
            if (this === localStorageRef) {
                collectNamespacedKeys().forEach((storedKey) => {
                    originalRemoveItem.call(this, storedKey);
                });
                return;
            }

            return originalClear.call(this);
        };
    }, {
        actorName,
        resetBackend,
        sharedKeys: SHARED_LOCAL_STORAGE_KEYS,
        backendResetKey: BACKEND_RESET_KEY
    });

    return page;
}

export async function openOperatorAccessSection(page) {
    const operatorAccessSection = page.locator('#operatorAccessSection');
    await expect(operatorAccessSection).toBeVisible();

    if (!(await operatorAccessSection.evaluate((element) => element.hasAttribute('open')))) {
        await operatorAccessSection.locator('summary').click();
    }

    await expect(page.locator('#operatorAccessCode')).toBeVisible();
}

export async function authorizeGameMaster(page, {
    displayName = 'Game Master Operator',
    operatorAccessCode = OPERATOR_ACCESS_CODE
} = {}) {
    await page.goto('/');
    await page.locator('#displayName').fill(displayName);
    await openOperatorAccessSection(page);
    await page.locator('#operatorAccessCode').fill(operatorAccessCode);
    await page.locator('#operatorGameMasterBtn').click();
    await page.waitForURL(/master\.html/);
}

export async function createSessionFromMaster(page, {
    sessionName,
    sessionCode,
    description = 'Automated live-demo rehearsal session.'
} = {}) {
    await page.locator('.sidebar-link[data-section="sessions"]').click();
    await page.locator('#createSessionBtn').click();

    const modal = page.locator('.modal-overlay');
    await modal.locator('#sessionName').fill(sessionName);
    await modal.locator('#sessionCode').fill(sessionCode);
    await modal.locator('#sessionDescription').fill(description);
    await modal.getByRole('button', { name: 'Create Session' }).click();

    await expect(page.locator('#sessionsList')).toContainText(sessionName);
    await expect(page.locator('#sessionsList')).toContainText(sessionCode);

    const backendState = await dumpE2EMockBackend(page);
    return backendState.tables.sessions.find((session) => normalizeSessionCode(session) === sessionCode) || null;
}

export async function joinPublicParticipant(page, {
    sessionCode,
    displayName,
    team = 'blue',
    roleSurface = 'facilitator'
} = {}) {
    await page.goto('/');
    await page.locator('#sessionCode').fill(sessionCode);
    await page.locator('#displayName').fill(displayName);
    await page.locator(`.chip[data-team="${team}"]`).click();
    await page.locator(`.chip[data-role-surface="${roleSurface}"]`).click();
    await page.getByRole('button', { name: 'Establish Connection' }).click();
    await page.waitForURL(resolveExpectedUrlPattern(roleSurface));
}

export async function expectJoinFailure(page, joinOptions, expectedMessage) {
    await page.goto('/');
    await page.locator('#sessionCode').fill(joinOptions.sessionCode);
    await page.locator('#displayName').fill(joinOptions.displayName);
    await page.locator(`.chip[data-team="${joinOptions.team || 'blue'}"]`).click();
    await page.locator(`.chip[data-role-surface="${joinOptions.roleSurface || 'facilitator'}"]`).click();
    await page.getByRole('button', { name: 'Establish Connection' }).click();

    await expect(page.locator('#joinForm')).toBeVisible();
    await expect(page.locator('#toast-container')).toContainText(expectedMessage);
}

export async function authorizeWhiteCell(page, {
    sessionCode,
    displayName,
    team = 'blue',
    operatorRole = 'lead',
    operatorAccessCode = OPERATOR_ACCESS_CODE
} = {}) {
    await page.goto('/');
    await page.locator('#sessionCode').fill(sessionCode);
    await page.locator('#displayName').fill(displayName);
    await page.locator(`.chip[data-team="${team}"]`).click();
    await openOperatorAccessSection(page);
    await page.locator('#operatorAccessCode').fill(operatorAccessCode);

    const accessButtonId = operatorRole === 'support'
        ? '#operatorWhiteCellSupportBtn'
        : '#operatorWhiteCellLeadBtn';

    await page.locator(accessButtonId).click();
    await page.waitForURL(/whitecell\.html/);
}

export async function openSidebarSection(page, section) {
    await page.locator(`.sidebar-link[data-section="${section}"]`).click();
}

export async function createDraftAction(page, {
    goal,
    mechanism = DEFAULT_ACTION_PAYLOAD.mechanism,
    sector = DEFAULT_ACTION_PAYLOAD.sector,
    exposureType = DEFAULT_ACTION_PAYLOAD.exposureType,
    priority = DEFAULT_ACTION_PAYLOAD.priority,
    targets = DEFAULT_ACTION_PAYLOAD.targets,
    expectedOutcomes = DEFAULT_ACTION_PAYLOAD.expectedOutcomes,
    allyContingencies = DEFAULT_ACTION_PAYLOAD.allyContingencies
} = {}) {
    await page.locator('#newActionBtn').click();

    const modal = page.locator('.modal-overlay');
    await modal.locator('#actionGoal').fill(goal);
    await modal.locator('#actionMechanism').selectOption(mechanism);
    await modal.locator('#actionSector').selectOption(sector);
    await modal.locator('#actionExposureType').selectOption(exposureType);
    await modal.locator('#actionPriority').selectOption(priority);
    await modal.locator('#actionTargets').selectOption(targets);
    await modal.locator('#actionExpectedOutcomes').fill(expectedOutcomes);
    await modal.locator('#actionAllyContingencies').fill(allyContingencies);
    await modal.getByRole('button', { name: 'Save Draft' }).click();

    await expect(page.locator('#actionsList')).toContainText(goal);
}

export async function submitAction(page, goal) {
    const actionCard = page.locator('#actionsList > *').filter({ hasText: goal }).first();
    await actionCard.getByRole('button', { name: 'Submit to White Cell' }).click();
    await page.locator('.modal-overlay').getByRole('button', { name: 'Submit' }).click();
    await expect(actionCard).toContainText('Submitted to White Cell');
}

export async function adjudicateAction(page, {
    goal,
    outcome = 'SUCCESS',
    notes = 'Validated through the live-demo topology suite.'
} = {}) {
    await openSidebarSection(page, 'adjudication');

    const adjudicationCard = page.locator('#adjudicationQueue > *').filter({ hasText: goal }).first();
    await expect(adjudicationCard).toContainText(goal);
    await adjudicationCard.locator('.adjudicate-btn').click();

    const modal = page.locator('.modal-overlay');
    await modal.locator('#outcomeSelect').selectOption(outcome);
    await modal.locator('#adjudicationNotes').fill(notes);
    await modal.getByRole('button', { name: 'Submit Adjudication' }).click();
}

export async function waitForToast(page, message) {
    await expect(page.locator('#toast-container')).toContainText(message);
}

export function getSessionFromState(backendState, sessionCode) {
    return backendState.tables.sessions.find((session) => normalizeSessionCode(session) === sessionCode) || null;
}

export function getActiveSeatCounts(backendState, sessionId) {
    return backendState.tables.session_participants
        .filter((seat) => seat.session_id === sessionId && seat.is_active === true)
        .reduce((counts, seat) => {
            counts[seat.role] = (counts[seat.role] || 0) + 1;
            return counts;
        }, {});
}
