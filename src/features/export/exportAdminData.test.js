import { describe, expect, it } from 'vitest';

import { exportSessionActionsCsv, exportSessionParticipantsCsv } from './exportCsv.js';
import { buildJsonExportPayload } from './exportJson.js';
import { generatePrintableReportFromData } from './exportPdf.js';

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

    it('includes selected-session metadata in printable reports', () => {
        const html = generatePrintableReportFromData({
            session: {
                id: 'session-1',
                name: 'Alpha',
                metadata: { session_code: 'ALPHA2026' }
            },
            gameState: { move: 2, phase: 4 },
            participants: [{ display_name: 'Alex', role: 'blue_facilitator', is_active: true }]
        });

        expect(html).toContain('Alpha');
        expect(html).toContain('ALPHA2026');
        expect(html).toContain('Active Participants');
    });
});
