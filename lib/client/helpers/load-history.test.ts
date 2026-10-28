import { beforeEach, describe, expect, it } from 'vitest';
import appendRideSummary from '@/lib/client/helpers/append-ride-summary';
import loadHistory from '@/lib/client/helpers/load-history';
import loadTempoCache from '@/lib/client/helpers/load-tempo-cache';
import saveTempoCache from '@/lib/client/helpers/save-tempo-cache';
import type { RideSummary } from '@/lib/client/models/types';

function buildSummary(id: string): RideSummary {
  return {
    id,
    rideId: 'ride',
    rideName: 'Ride',
    difficulty: 3,
    startedAt: '2026-10-28T08:00:00.000Z',
    durationSeconds: 1800,
    averageWatts: 150,
    maxWatts: 300,
    miles: 10,
    averageMph: 20,
    secondsInZone: [0, 0, 0, 0, 0, 0, 0],
    missingSeconds: 0,
    ftpUsed: 150,
  };
}

describe('loadHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is empty on fresh storage', () => {
    // Arrange / Act / Assert
    expect(loadHistory()).toEqual([]);
  });

  it('returns newest first after two appends', () => {
    // Arrange
    appendRideSummary(buildSummary('first'));
    appendRideSummary(buildSummary('second'));

    // Act
    const history = loadHistory();

    // Assert
    expect(history.map((summary) => summary.id)).toEqual(['second', 'first']);
  });

  it('drops corrupt entries', () => {
    // Arrange
    const valid: RideSummary = buildSummary('valid');
    localStorage.setItem(
      'typhoon.history',
      JSON.stringify([valid, null, 'text', { id: 7, secondsInZone: [0, 0, 0, 0, 0, 0, 0] }, { id: 'short', secondsInZone: [0] }, { id: 'none' }]),
    );

    // Act
    const history = loadHistory();

    // Assert
    expect(history).toEqual([valid]);
  });
});

describe('loadTempoCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved cache including nulls', () => {
    // Arrange
    saveTempoCache({ trackA: 120, trackB: null });

    // Act
    const cache = loadTempoCache();

    // Assert
    expect(cache).toEqual({ trackA: 120, trackB: null });
  });
});
