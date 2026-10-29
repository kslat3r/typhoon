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
    expect(stats.secondsInZone[2]).toBe(5);
    expect(stats.maxWatts).toBe(150);
    expect(stats.miles).toBeGreaterThan(0);
    expect(start.sampledSeconds).toBe(0);
    expect(start.secondsInZone[2]).toBe(0);
  });

  it('excludes missing samples from averages', () => {
    // Arrange / Act
    const stats = accumulateRideStats(emptyRideStats(), null, 7, 150);

    // Assert
    expect(stats.missingSeconds).toBe(7);
    expect(stats.sampledSeconds).toBe(0);
    expect(stats.miles).toBe(0);
  });
});
