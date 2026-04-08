import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { exportSessionActionsCsv, exportSessionParticipantsCsv } from './exportCsv.js';
import { buildJsonExportPayload } from './exportJson.js';
import * as exportFeature from './index.js';

describe('admin export helpers', () => {
    it('builds explicit JSON payloads from selected-session data', () => {
        const payload = buildJsonExportPayload({
            session: { id: 'session-1', name: 'Alpha' },
            gameState: { move: 2, phase: 3 },
            actions: [{ id: 'a1' }],
            requests: [{ id: 'r1' }],
            timeline: [{ id: 't1' }],
            participants: [{ id: 'p1' }],
            exportedAt: '2026-04-06T12:00:00.000Z'
        });

        expect(payload).toMatchObject({
            exportedAt: '2026-04-06T12:00:00.000Z',
            session: { id: 'session-1', name: 'Alpha' },
            gameState: { move: 2, phase: 3 },
            actions: [{ id: 'a1' }],
            requests: [{ id: 'r1' }],
            timeline: [{ id: 't1' }],
            participants: [{ id: 'p1' }]
        });
    });

    it('serializes current-schema actions and participants to CSV', () => {
        const actionsCsv = exportSessionActionsCsv([
            {
                id: 'a1',
                team: 'blue',
                move: 1,
                phase: 2,
                mechanism: 'Tariff',
                targets: ['Partner A', 'Partner B'],
                goal: 'Protect industry',
                expected_outcomes: 'Reduce exposure',
                priority: 'HIGH',
                status: 'submitted'
            }
        ]);
        const participantsCsv = exportSessionParticipantsCsv([
            {
                id: 'p1',
                display_name: 'Alex',
                role: 'blue_facilitator',
                is_active: true
            }
        ]);

        expect(actionsCsv).toContain('mechanism');
        expect(actionsCsv).toContain('"Partner A; Partner B"');
        expect(participantsCsv).toContain('display_name');
        expect(participantsCsv).toContain('Alex');
    });

    it('exports only JSON and CSV helpers from the feature barrel', () => {
        expect(Object.keys(exportFeature)).toEqual(expect.arrayContaining([
            'arrayToCsv',
            'buildJsonExportPayload',
            'createExportPanel',
            'downloadCsv',
            'downloadJson',
            'downloadJsonData',
            'exportActionsCsv',
            'exportAllCsv',
            'exportParticipantsCsv',
            'exportRequestsCsv',
            'exportSessionActionsCsv',
            'exportSessionParticipantsCsv',
            'exportSessionRequestsCsv',
            'exportSessionTimelineCsv',
            'exportSubset',
            'exportTimelineCsv',
            'exportToJson',
            'showExportModal'
        ]));
        expect(exportFeature).not.toHaveProperty('generatePrintableReport');
        expect(exportFeature).not.toHaveProperty('openPrintableReport');
        expect(exportFeature).not.toHaveProperty('printReport');
    });

    it('removes PDF, XLSX, and ZIP controls from the live operator markup', () => {
        const masterHtml = readFileSync(new URL('../../../master.html', import.meta.url), 'utf8');

        expect(masterHtml).not.toContain('exportPdfBtn');
        expect(masterHtml).not.toContain('Print / PDF');
        expect(masterHtml).not.toContain('XLSX');
        expect(masterHtml).not.toContain('ZIP');
    });
});
