import { describe, expect, it } from 'vitest';
import accumulateRideStats from '@/lib/client/helpers/accumulate-ride-stats';
import emptyRideStats from '@/lib/client/helpers/empty-ride-stats';

describe('accumulateRideStats', () => {
  it('accumulates stats over a 5 second gap', () => {
    // Arrange
    const start = emptyRideStats();

    // Act
    const stats = accumulateRideStats(start, { watts: 150, rpm: 90, receivedAt: 0 }, 5, 150);

    // Assert
    expect(stats.sampledSeconds).toBe(5);
    expect(stats.wattSeconds).toBe(750);
    expect(stats.secondsInZone[3]).toBe(5);
    expect(stats.maxWatts).toBe(150);
    expect(stats.miles).toBeGreaterThan(0);
    expect(start.sampledSeconds).toBe(0);
    expect(start.secondsInZone[3]).toBe(0);
  });

  it('excludes missing samples from averages and still counts the planned zone', () => {
    // Arrange / Act
    const stats = accumulateRideStats(emptyRideStats(), null, 7, 150, 2);

    // Assert
    expect(stats.missingSeconds).toBe(7);
    expect(stats.sampledSeconds).toBe(0);
    expect(stats.miles).toBe(0);
    expect(stats.plannedSecondsInZone[1]).toBe(7);
    expect(stats.rpmSampledSeconds).toBe(0);
  });

  it('averages cadence and builds normalized power from one-second samples', () => {
    // Arrange
    let stats = emptyRideStats();

    // Act
    stats = accumulateRideStats(stats, { watts: 100, rpm: 80, receivedAt: 0 }, 30, 200);
    stats = accumulateRideStats(stats, { watts: 300, rpm: 100, receivedAt: 0 }, 30, 200);

    // Assert
    expect(stats.rpmSampledSeconds).toBe(60);
    expect(stats.maxRpm).toBe(100);
    expect(stats.npWindows).toBeGreaterThan(1);
    const normalized = (stats.npFourthSum / stats.npWindows) ** 0.25;
    expect(normalized).toBeGreaterThan(200);
    expect(normalized).toBeLessThan(300);
  });
});
