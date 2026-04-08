import { test, expect } from '@playwright/test';

import { dumpE2EMockBackend, enableE2EMockBackend } from './support/mockBackend.js';
import { openOperatorAccessSection } from './support/liveDemoHarness.js';

test('@smoke session creation, role join, action submit, and White Cell adjudication', async ({ browser }) => {
    const context = await browser.newContext();
    await enableE2EMockBackend(context);

    const page = await context.newPage();
    const operatorAccessCode = 'admin2025';
    const sessionName = 'Smoke Session Alpha';
    const sessionCode = 'SMOKE2026';
    const actionGoal = 'Coordinate export controls to reduce semiconductor exposure across allied partners.';

    await test.step('create a session from the control panel', async () => {
        await page.goto('/');
        await page.locator('#displayName').fill('Game Master Operator');
        await openOperatorAccessSection(page);
        await page.locator('#operatorAccessCode').fill(operatorAccessCode);
        await page.locator('#operatorGameMasterBtn').click();
        await page.waitForURL(/master\.html/);

        await page.locator('.sidebar-link[data-section="sessions"]').click();
        await page.locator('#createSessionBtn').click();

        const modal = page.locator('.modal-overlay');
        await modal.locator('#sessionName').fill(sessionName);
        await modal.locator('#sessionCode').fill(sessionCode);
        await modal.locator('#sessionDescription').fill('Automated smoke flow for the shipped ESG build.');
        await modal.getByRole('button', { name: 'Create Session' }).click();

        await expect(page.locator('#sessionsList')).toContainText(sessionName);
        await expect(page.locator('#sessionsList')).toContainText(sessionCode);
    });

    await test.step('join as facilitator and submit an action', async () => {
        await page.goto('/');
        await page.locator('#sessionCode').fill(sessionCode);
        await page.locator('#displayName').fill('Blue Lead');
        await page.locator('.chip[data-team="blue"]').click();
        await page.locator('.chip[data-role-surface="facilitator"]').click();
        await page.getByRole('button', { name: 'Join Session' }).click();

        await page.waitForURL(/facilitator\.html/);
        await page.locator('#newActionBtn').click();

        const modal = page.locator('.modal-overlay');
        await modal.locator('#actionGoal').fill(actionGoal);
        await modal.locator('#actionMechanism').selectOption('export');
        await modal.locator('#actionSector').selectOption('semiconductors');
        await modal.locator('#actionExposureType').selectOption('Technology');
        await modal.locator('#actionPriority').selectOption('HIGH');
        await modal.locator('#actionTargets').selectOption(['PRC', 'TWN']);
        await modal.locator('#actionExpectedOutcomes').fill('Reduce allied dependence and build leverage before the next move begins.');
        await modal.locator('#actionAllyContingencies').fill('Coordinate with allies first so enforcement and messaging remain aligned.');
        await modal.getByRole('button', { name: 'Save Draft' }).click();

        await expect(page.locator('#actionsList')).toContainText(actionGoal);
        await expect(page.locator('#actionsList')).toContainText('Submit to White Cell');

        await page.getByRole('button', { name: 'Submit to White Cell' }).click();
        await page.locator('.modal-overlay').getByRole('button', { name: 'Submit' }).click();

        await expect(page.locator('#actionsList')).toContainText('Submitted to White Cell');
    });

    await test.step('rejoin as White Cell and adjudicate the submitted action', async () => {
        await page.locator('#logoutBtn').click();
        await page.waitForURL(/\/$/);

        await page.locator('#sessionCode').fill(sessionCode);
        await page.locator('#displayName').fill('White Cell Lead');
        await page.locator('.chip[data-team="blue"]').click();
        await openOperatorAccessSection(page);
        await page.locator('#operatorAccessCode').fill(operatorAccessCode);
        await page.locator('#operatorWhiteCellLeadBtn').click();

        await page.waitForURL(/whitecell\.html/);
        await page.locator('.sidebar-link[data-section="adjudication"]').click();
        await expect(page.locator('#adjudicationQueue')).toContainText(actionGoal);

        await page.locator('#adjudicationQueue .adjudicate-btn').first().click();
        const modal = page.locator('.modal-overlay');
        await modal.locator('#outcomeSelect').selectOption('SUCCESS');
        await modal.locator('#adjudicationNotes').fill('Approved in smoke test to verify the live submitted-to-adjudicated flow.');
        await modal.getByRole('button', { name: 'Submit Adjudication' }).click();

        await expect(page.locator('#adjudicationQueue')).toContainText('No actions are waiting for adjudication.');

        await page.locator('.sidebar-link[data-section="timeline"]').click();
        await expect(page.locator('#timelineList')).toContainText('Action adjudicated: SUCCESS');
    });

    await test.step('verify the mock backend reflects the completed lifecycle', async () => {
        const backendState = await dumpE2EMockBackend(page);
        const actionRecord = backendState.tables.actions[0];

        expect(actionRecord.goal).toBe(actionGoal);
        expect(actionRecord.status).toBe('adjudicated');
        expect(actionRecord.outcome).toBe('SUCCESS');
        expect(actionRecord.submitted_at).toBeTruthy();
        expect(actionRecord.adjudicated_at).toBeTruthy();
    });

    await context.close();
});
