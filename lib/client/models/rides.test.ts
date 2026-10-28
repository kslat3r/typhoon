import { describe, expect, it } from 'vitest';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride, RideInterval } from '@/lib/client/models/types';

const EASY_RIDES: Ride[] = RIDES.filter((r) => r.difficulty <= 2);
const HARD_RIDES: Ride[] = RIDES.filter((r) => r.difficulty >= 4);

function secondsAtZoneFourAndAbove(ride: Ride): number {
  return ride.intervals.filter((i) => i.zone >= 4).reduce((sum, i) => sum + i.seconds, 0);
}

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

  it.each(EASY_RIDES)('$name stays at zone 5 or below with short zone 5 efforts', (ride: Ride) => {
    // Arrange / Act
    const zoneFiveIntervals: RideInterval[] = ride.intervals.filter((i) => i.zone === 5);

    // Assert
    expect(Math.max(...ride.intervals.map((i) => i.zone))).toBeLessThanOrEqual(5);
    for (const interval of zoneFiveIntervals) {
      expect(interval.seconds).toBeLessThanOrEqual(30);
    }
  });

  it.each(EASY_RIDES)('$name recovers at least as long as each effort run', (ride: Ride) => {
    // Arrange
    const intervals: RideInterval[] = ride.intervals;
    let index: number = 0;

    // Act / Assert
    while (index < intervals.length) {
      if (intervals[index].zone < 4) {
        index += 1;
        continue;
      }
      // A run is zone 4+ efforts plus any zone 3 unders between them.
      let lastHardIndex: number = index;
      let scanIndex: number = index;
      while (scanIndex < intervals.length && intervals[scanIndex].zone >= 3) {
        if (intervals[scanIndex].zone >= 4) {
          lastHardIndex = scanIndex;
        }
        scanIndex += 1;
      }
      const runSeconds: number = intervals.slice(index, lastHardIndex + 1).reduce((sum, i) => sum + i.seconds, 0);
      let recoveryIndex: number = lastHardIndex + 1;
      while (recoveryIndex < intervals.length && intervals[recoveryIndex].zone === 3) {
        recoveryIndex += 1;
      }
      const recovery: RideInterval | undefined = intervals[recoveryIndex];
      expect(recovery, `run at interval ${index}`).toBeDefined();
      expect(recovery.zone).toBeLessThanOrEqual(2);
      expect(recovery.seconds, `run at interval ${index} of ${runSeconds} s`).toBeGreaterThanOrEqual(runSeconds);
      index = lastHardIndex + 1;
    }
  });

  it.each(RIDES)('$name keeps zone 7 sprints to 30 s or less', (ride: Ride) => {
    // Arrange / Act
    const sprints: RideInterval[] = ride.intervals.filter((i) => i.zone === 7);

    // Assert
    for (const sprint of sprints) {
      expect(sprint.seconds).toBeLessThanOrEqual(30);
    }
  });

  it.each(HARD_RIDES)('$name does more work at zone 4 and above than any easy ride of its length', (ride: Ride) => {
    // Arrange
    const easyRidesOfSameLength: Ride[] = EASY_RIDES.filter((r) => r.lengthSeconds === ride.lengthSeconds);

    // Act
    const hardSeconds: number = secondsAtZoneFourAndAbove(ride);

    // Assert
    for (const easyRide of easyRidesOfSameLength) {
      expect(hardSeconds, easyRide.name).toBeGreaterThan(secondsAtZoneFourAndAbove(easyRide));
    }
  });

  it('gives every ride of a length its own warm-up', () => {
    // Arrange
    const openings: string[] = RIDES.map((r) => `${r.lengthSeconds}:${JSON.stringify(r.intervals.slice(0, 5))}`);

    // Act / Assert
    expect(new Set(openings).size).toBe(RIDES.length);
  });

  it('has unique ids', () => {
    // Arrange / Act
    const ids: Set<string> = new Set(RIDES.map((r) => r.id));

    // Assert
    expect(ids.size).toBe(RIDES.length);
  });
});
