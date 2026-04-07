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
    it('hydrates schema columns and defaults missing values', () => {
        const viewState = buildNotetakerViewState({
            dynamics_analysis: {
                emergingLeaders: 'Taylor'
            },
            external_factors: null,
            observation_timeline: null
        });

        expect(viewState.dynamicsData).toEqual({
            ...DEFAULT_DYNAMICS_DATA,
            emergingLeaders: 'Taylor'
        });
        expect(viewState.allianceData).toEqual(DEFAULT_ALLIANCE_DATA);
        expect(viewState.observationTimeline).toEqual([]);
    });

    it('restores the last saved state for the selected move after incremental saves', () => {
        const firstSave = mergeNotetakerRecord(null, {
            session_id: 'session-77',
            move: 1,
            phase: 2,
            team: 'blue',
            client_id: 'client-77',
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
            createdAt: '2026-04-06T12:02:00.000Z'
        });

        const secondSave = mergeNotetakerRecord(firstSave, {
            session_id: 'session-77',
            move: 1,
            phase: 2,
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
            client_id: 'client-77',
            dynamics_analysis: {
                emergingLeaders: 'Morgan'
            }
        }, {
            timestamp: '2026-04-06T12:05:00.000Z'
        });

        const restoredRecord = getNotetakerRecordForMove([secondSave, otherMoveRecord], 1);
        const restoredState = buildNotetakerViewState(restoredRecord);

        expect(restoredState.dynamicsData).toMatchObject({
            emergingLeaders: 'Sam',
            frictionLevel: '7'
        });
        expect(restoredState.allianceData).toMatchObject({
            allianceNotes: 'Regional partners aligned',
            externalPressures: 'Commodity price shock'
        });
        expect(restoredState.observationTimeline).toEqual([captureEntry]);
    });
});
