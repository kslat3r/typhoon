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
    { zone: 2, seconds: 1440 },
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
    expect(summary.plannedSeconds).toBe(1800);
    expect(summary.kilojoules).toBe(20);
    expect(summary.intensityPercent).toBe(133);
    expect(summary.normalizedPower).toBeUndefined();
    expect(summary.averageRpm).toBeUndefined();
  });

  it('stores cadence, normalized power, and planned zones when they were recorded', () => {
    // Arrange
    const stats = {
      ...emptyRideStats(),
      sampledSeconds: 60,
      wattSeconds: 12000,
      maxWatts: 300,
      miles: 0.4,
      rpmSeconds: 5280,
      rpmSampledSeconds: 60,
      maxRpm: 100,
      npFourthSum: 30 * 200 ** 4,
      npWindows: 30,
      plannedSecondsInZone: [0, 40, 0, 20, 0, 0, 0] as [number, number, number, number, number, number, number],
    };

    // Act
    const summary = summariseRide(ride, stats, 200, new Date('2026-10-28T07:00:00Z'));

    // Assert
    expect(summary.averageWatts).toBe(200);
    expect(summary.averageRpm).toBe(88);
    expect(summary.maxRpm).toBe(100);
    expect(summary.normalizedPower).toBe(200);
    expect(summary.intensityFactor).toBe(1);
    expect(summary.intensityPercent).toBe(100);
    expect(summary.kilojoules).toBe(12);
    expect(summary.plannedSecondsInZone).toEqual([0, 40, 0, 20, 0, 0, 0]);
  });

  it('reports zero averages when nothing was sampled', () => {
    // Arrange / Act
    const summary = summariseRide(ride, emptyRideStats(), 150, new Date('2026-10-28T07:00:00Z'));

    // Assert
    expect(summary.averageWatts).toBe(0);
    expect(summary.averageMph).toBe(0);
  });
});
