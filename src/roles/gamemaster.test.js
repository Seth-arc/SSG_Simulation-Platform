import { describe, expect, it } from 'vitest';

import {
    buildDashboardModel,
    buildExportSelectionState,
    buildRecentActivityModel,
    getAdminExportButtonConfig
} from './gamemaster.js';

describe('GameMaster dashboard mapping', () => {
    it('computes real aggregate dashboard counts from session bundles', () => {
        const bundles = [
            {
                session: { id: 'session-1', name: 'Alpha' },
                participants: [{ id: 'p1' }, { id: 'p2' }],
                actions: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
                requests: [{ id: 'r1', status: 'pending' }, { id: 'r2', status: 'answered' }],
                timeline: []
            },
            {
                session: { id: 'session-2', name: 'Bravo' },
                participants: [{ id: 'p3' }],
                actions: [{ id: 'a4' }],
                requests: [{ id: 'r3', status: 'pending' }, { id: 'r4', status: 'pending' }],
                timeline: []
            }
        ];

        expect(buildDashboardModel(bundles)).toEqual({
            activeSessions: 2,
            totalParticipants: 3,
            totalActions: 4,
            pendingRequests: 3
        });
    });

    it('orders recent activity newest-first across sessions', () => {
        const recent = buildRecentActivityModel([
            {
                session: { id: 'session-1', name: 'Alpha' },
                timeline: [
                    { id: 't1', content: 'Older', created_at: '2026-04-06T10:00:00.000Z' }
                ]
            },
            {
                session: { id: 'session-2', name: 'Bravo' },
                timeline: [
                    { id: 't2', content: 'Newest', created_at: '2026-04-06T11:00:00.000Z' }
                ]
            }
        ]);

        expect(recent.map((item) => item.id)).toEqual(['t2', 't1']);
        expect(recent[0].sessionName).toBe('Bravo');
    });
});

describe('GameMaster export wiring', () => {
    it('matches the rendered export button set and only includes PDF when supported', () => {
        expect(getAdminExportButtonConfig().map((config) => config.id)).toEqual([
            'exportJsonBtn',
            'exportActionsCsvBtn',
            'exportRequestsCsvBtn',
            'exportTimelineCsvBtn',
            'exportParticipantsCsvBtn',
            'exportPdfBtn'
        ]);

        expect(getAdminExportButtonConfig({ supportsPdf: false }).map((config) => config.id)).toEqual([
            'exportJsonBtn',
            'exportActionsCsvBtn',
            'exportRequestsCsvBtn',
            'exportTimelineCsvBtn',
            'exportParticipantsCsvBtn'
        ]);
    });

    it('disables export controls until a session is selected', () => {
        expect(buildExportSelectionState()).toEqual({
            disabled: true,
            message: 'Select a session before exporting data.'
        });

        expect(buildExportSelectionState({
            session: { id: 'session-1', name: 'Alpha' }
        })).toEqual({
            disabled: false,
            message: 'Exporting data for Alpha.'
        });
    });
});
