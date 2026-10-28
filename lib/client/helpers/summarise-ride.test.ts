import { describe, expect, it } from 'vitest';
import emptyRideStats from '@/lib/client/helpers/empty-ride-stats';
import summariseRide from '@/lib/client/helpers/summarise-ride';
import type { Ride } from '@/lib/client/models/types';

const ride: Ride = {
  id: 't',
  name: 'T',
  lengthSeconds: 1800,
  difficulty: 1,
  archetype: 'endurance',
  intervals: [
    { zone: 2, seconds: 300 },
    { zone: 4, seconds: 60 },
    { zone: 1, seconds: 1440 },
  ],
};

describe('summariseRide', () => {
  it('summarises a ride', () => {
    // Arrange
    const stats = { ...emptyRideStats(), sampledSeconds: 100, wattSeconds: 20000, maxWatts: 300, miles: 0.5, missingSeconds: 4 };

    // Act
    const summary = summariseRide(ride, stats, 150, new Date('2026-10-28T07:00:00Z'));

    // Assert
    expect(summary.averageWatts).toBe(200);
    expect(summary.averageMph).toBe(18);
    expect(summary.ftpUsed).toBe(150);
    expect(summary.missingSeconds).toBe(4);
    expect(summary.startedAt).toBe('2026-10-28T07:00:00.000Z');
    expect(summary.durationSeconds).toBe(104);
    expect(summary.ftpTestAverageWatts).toBeUndefined();
  });

  it('reports zero averages when nothing was sampled', () => {
    // Arrange / Act
    const summary = summariseRide(ride, emptyRideStats(), 150, new Date('2026-10-28T07:00:00Z'));

    // Assert
    expect(summary.averageWatts).toBe(0);
    expect(summary.averageMph).toBe(0);
  });
});
