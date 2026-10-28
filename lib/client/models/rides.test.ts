import { describe, expect, it } from 'vitest';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

describe('ride library', () => {
  it.each(RIDES)('$name sums to its length', (ride: Ride) => {
    // Arrange / Act
    const total: number = ride.intervals.reduce((sum, i) => sum + i.seconds, 0);

    // Assert
    expect(total).toBe(ride.lengthSeconds);
    expect([1800, 2700]).toContain(ride.lengthSeconds);
  });

  it.each(RIDES)('$name warms up and cools down', (ride: Ride) => {
    // Arrange / Act
    const first = ride.intervals[0];
    const last = ride.intervals[ride.intervals.length - 1];

    // Assert
    expect(first.zone).toBeLessThanOrEqual(2);
    expect(first.seconds).toBeGreaterThanOrEqual(180);
    expect(last.zone).toBeLessThanOrEqual(2);
    expect(last.seconds).toBeGreaterThanOrEqual(120);
  });

  it.each(RIDES)('$name varies its interval shapes', (ride: Ride) => {
    // Arrange / Act
    const durations: Set<number> = new Set(ride.intervals.map((i) => i.seconds));

    // Assert
    expect(durations.size).toBeGreaterThanOrEqual(4);
    if (ride.difficulty >= 3) {
      expect(ride.intervals.some((i) => i.seconds <= 30)).toBe(true);
    }
    expect(ride.intervals.length).toBeGreaterThanOrEqual(10);
  });

  it('has two rides per difficulty per length', () => {
    // Arrange
    const lengths: number[] = [1800, 2700];
    const difficulties: number[] = [1, 2, 3, 4, 5];

    // Act / Assert
    for (const length of lengths) {
      for (const difficulty of difficulties) {
        const count: number = RIDES.filter((r) => r.lengthSeconds === length && r.difficulty === difficulty).length;
        expect(count).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has unique ids', () => {
    // Arrange / Act
    const ids: Set<string> = new Set(RIDES.map((r) => r.id));

    // Assert
    expect(ids.size).toBe(RIDES.length);
  });
});
