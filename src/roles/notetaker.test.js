import { describe, expect, it } from 'vitest';

import { mergeNotetakerRecord } from '../services/database.js';
import {
    DEFAULT_ALLIANCE_DATA,
    DEFAULT_DYNAMICS_DATA,
    buildNotetakerViewState,
    createObservationTimelineEntry,
    getNotetakerRecordForMove
} from './notetaker.js';

describe('Notetaker move-scoped view state', () => {
    it('hydrates participant-scoped notes and filters move observations by team', () => {
        const viewState = buildNotetakerViewState({
            dynamics_analysis: {
                schema_version: 2,
                team_entries: {
                    blue: {
                        participant_entries: {
                            'seat-blue-1': {
                                participant_key: 'seat-blue-1',
                                data: {
                                    emergingLeaders: 'Taylor'
                                }
                            }
                        }
                    }
                }
            },
            external_factors: null,
            observation_timeline: [
                {
                    id: 'obs-blue-1',
                    team: 'blue',
                    type: 'NOTE',
                    content: 'Blue note'
                },
                {
                    id: 'obs-red-1',
                    team: 'red',
                    type: 'NOTE',
                    content: 'Red note'
                }
            ]
        }, {
            teamId: 'blue',
            participantKey: 'seat-blue-1'
        });

        expect(viewState.dynamicsData).toEqual({
            ...DEFAULT_DYNAMICS_DATA,
            emergingLeaders: 'Taylor'
        });
        expect(viewState.allianceData).toEqual(DEFAULT_ALLIANCE_DATA);
        expect(viewState.observationTimeline).toEqual([
            {
                id: 'obs-blue-1',
                team: 'blue',
                type: 'NOTE',
                content: 'Blue note'
            }
        ]);
    });

    it('restores each notetaker seat without overwriting a second seat on the same move', () => {
        const firstSave = mergeNotetakerRecord(null, {
            session_id: 'session-77',
            move: 1,
            phase: 2,
            team: 'blue',
            client_id: 'client-blue-1',
            participant_key: 'seat-blue-1',
            participant_id: 'seat-blue-1',
            dynamics_analysis: {
                emergingLeaders: 'Sam',
                frictionLevel: '7'
            }
        }, {
            timestamp: '2026-04-06T12:00:00.000Z'
        });

        const captureEntry = createObservationTimelineEntry({
            id: 'obs-77',
            type: 'NOTE',
            content: 'Delegation pressure rising',
            phase: 2,
            createdAt: '2026-04-06T12:02:00.000Z',
            teamId: 'blue',
            participantKey: 'seat-blue-1'
        });

        const secondSave = mergeNotetakerRecord(firstSave, {
            session_id: 'session-77',
            move: 1,
            phase: 2,
            team: 'blue',
            client_id: 'client-blue-2',
            participant_key: 'seat-blue-2',
            participant_id: 'seat-blue-2',
            dynamics_analysis: {
                emergingLeaders: 'Morgan',
                consensusLevel: '8'
            }
        }, {
            timestamp: '2026-04-06T12:01:00.000Z'
        });

        const thirdSave = mergeNotetakerRecord(secondSave, {
            session_id: 'session-77',
            move: 1,
            phase: 2,
            team: 'blue',
            client_id: 'client-blue-1',
            participant_key: 'seat-blue-1',
            participant_id: 'seat-blue-1',
            external_factors: {
                allianceNotes: 'Regional partners aligned',
                externalPressures: 'Commodity price shock'
            },
            observation_timeline_append: [captureEntry]
        }, {
            timestamp: '2026-04-06T12:02:00.000Z'
        });

        const otherMoveRecord = mergeNotetakerRecord(null, {
            session_id: 'session-77',
            move: 2,
            phase: 1,
            team: 'blue',
            client_id: 'client-blue-1',
            participant_key: 'seat-blue-1',
            participant_id: 'seat-blue-1',
            dynamics_analysis: {
                emergingLeaders: 'Morgan'
            }
        }, {
            timestamp: '2026-04-06T12:05:00.000Z'
        });

        const restoredRecord = getNotetakerRecordForMove([thirdSave, otherMoveRecord], 1);
        const restoredState = buildNotetakerViewState(restoredRecord, {
            teamId: 'blue',
            participantKey: 'seat-blue-1'
        });
        const secondSeatState = buildNotetakerViewState(restoredRecord, {
            teamId: 'blue',
            participantKey: 'seat-blue-2'
        });

        expect(restoredState.dynamicsData).toMatchObject({
            emergingLeaders: 'Sam',
            frictionLevel: '7'
        });
        expect(restoredState.allianceData).toMatchObject({
            allianceNotes: 'Regional partners aligned',
            externalPressures: 'Commodity price shock'
        });
        expect(restoredState.observationTimeline).toEqual([
            {
                ...captureEntry,
                participant_id: 'seat-blue-1',
                client_id: 'client-blue-1',
                participant_label: null
            }
        ]);

        expect(secondSeatState.dynamicsData).toMatchObject({
            emergingLeaders: 'Morgan',
            consensusLevel: '8'
        });
        expect(secondSeatState.allianceData).toEqual(DEFAULT_ALLIANCE_DATA);
    });
});
