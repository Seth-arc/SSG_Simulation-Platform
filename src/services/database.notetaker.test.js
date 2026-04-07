import { describe, expect, it } from 'vitest';

import { mergeNotetakerRecord } from './database.js';

describe('mergeNotetakerRecord', () => {
    it('preserves existing schema fields when saving partial move-scoped updates', () => {
        const existingRecord = {
            session_id: 'session-1',
            move: 2,
            phase: 1,
            team: 'blue',
            client_id: 'client-1',
            dynamics_analysis: {
                emergingLeaders: 'Alex'
            },
            external_factors: {
                allianceNotes: 'Existing alliance note'
            },
            observation_timeline: [
                {
                    id: 'obs-1',
                    type: 'NOTE',
                    content: 'Initial observation',
                    phase: 1,
                    timestamp: '2026-04-06T10:00:00.000Z'
                }
            ]
        };

        const mergedRecord = mergeNotetakerRecord(existingRecord, {
            session_id: 'session-1',
            move: 2,
            phase: 3,
            dynamics_analysis: {
                emergingLeaders: 'Jordan',
                dynamicsSummary: 'New summary'
            }
        }, {
            clientId: 'client-fallback',
            timestamp: '2026-04-06T11:00:00.000Z'
        });

        expect(mergedRecord).toMatchObject({
            session_id: 'session-1',
            move: 2,
            phase: 3,
            team: 'blue',
            client_id: 'client-1',
            dynamics_analysis: {
                emergingLeaders: 'Jordan',
                dynamicsSummary: 'New summary'
            },
            external_factors: {
                allianceNotes: 'Existing alliance note'
            },
            updated_at: '2026-04-06T11:00:00.000Z'
        });
        expect(mergedRecord.observation_timeline).toEqual(existingRecord.observation_timeline);
    });

    it('appends observation_timeline entries instead of replacing prior observations', () => {
        const existingRecord = {
            session_id: 'session-1',
            move: 1,
            phase: 2,
            team: 'blue',
            client_id: 'client-1',
            dynamics_analysis: {},
            external_factors: {},
            observation_timeline: [
                {
                    id: 'obs-1',
                    type: 'NOTE',
                    content: 'Existing note',
                    phase: 2,
                    timestamp: '2026-04-06T10:00:00.000Z'
                }
            ]
        };

        const appendedRecord = mergeNotetakerRecord(existingRecord, {
            session_id: 'session-1',
            move: 1,
            observation_timeline_append: [
                {
                    id: 'obs-2',
                    type: 'QUOTE',
                    content: 'New quote',
                    phase: 2,
                    timestamp: '2026-04-06T10:05:00.000Z'
                }
            ]
        }, {
            timestamp: '2026-04-06T10:05:00.000Z'
        });

        expect(appendedRecord.observation_timeline).toEqual([
            existingRecord.observation_timeline[0],
            {
                id: 'obs-2',
                type: 'QUOTE',
                content: 'New quote',
                phase: 2,
                timestamp: '2026-04-06T10:05:00.000Z'
            }
        ]);
        expect(appendedRecord.phase).toBe(2);
        expect(appendedRecord.team).toBe('blue');
    });
});
