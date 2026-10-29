import { describe, expect, it } from 'vitest';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride, RideInterval } from '@/lib/client/models/types';

const LENGTHS: number[] = [1800, 2700];
const DIFFICULTIES: number[] = [1, 2, 3, 4, 5];

function secondsAtOrAbove(ride: Ride, zone: number): number {
  return ride.intervals.filter((i) => i.zone >= zone).reduce((sum, i) => sum + i.seconds, 0);
}

function meanSecondsAtOrAbove(rides: Ride[], zone: number): number {
  return rides.reduce((sum, ride) => sum + secondsAtOrAbove(ride, zone), 0) / rides.length;
}

describe('ride library', () => {
  it.each(RIDES)('$name sums to its length', (ride: Ride) => {
    // Arrange / Act
    const total: number = ride.intervals.reduce((sum, i) => sum + i.seconds, 0);

    // Assert
    expect(total).toBe(ride.lengthSeconds);
    expect(LENGTHS).toContain(ride.lengthSeconds);
  });

  it.each(RIDES)('$name opens with a short spin, a 2 to 3 minute warm-up and cools down in zone 2', (ride: Ride) => {
    // Arrange / Act
    const spin = ride.intervals[0];
    const warmUp = ride.intervals[1];
    const last = ride.intervals[ride.intervals.length - 1];

    // Assert
    expect(spin.zone).toBe(2);
    expect(spin.seconds).toBeGreaterThanOrEqual(60);
    expect(spin.seconds).toBeLessThanOrEqual(90);
    expect(warmUp.zone).toBe(3);
    expect(warmUp.seconds).toBeGreaterThanOrEqual(120);
    expect(warmUp.seconds).toBeLessThanOrEqual(180);
    expect(last.zone).toBe(2);
    expect(last.seconds).toBeGreaterThanOrEqual(120);
  });

  it.each(RIDES)('$name varies its interval shapes', (ride: Ride) => {
    // Arrange / Act
    const durations: Set<number> = new Set(ride.intervals.map((i) => i.seconds));

    // Assert
    expect(durations.size).toBeGreaterThanOrEqual(4);
    expect(ride.intervals.some((i) => i.seconds <= 30)).toBe(true);
    expect(ride.intervals.length).toBeGreaterThanOrEqual(10);
  });

  it('has five rides per difficulty per length', () => {
    // Arrange / Act / Assert
    for (const length of LENGTHS) {
      for (const difficulty of DIFFICULTIES) {
        const count: number = RIDES.filter((r) => r.lengthSeconds === length && r.difficulty === difficulty).length;
        expect(count, `${length} s at difficulty ${difficulty}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it.each(RIDES.filter((r) => r.difficulty === 1))('$name keeps the easiest grade to short zone 7 efforts', (ride: Ride) => {
    // Arrange / Act
    const zoneSeven: RideInterval[] = ride.intervals.filter((i) => i.zone === 7);

    // Assert
    for (const interval of zoneSeven) {
      expect(interval.seconds).toBeLessThanOrEqual(30);
    }
  });

  it.each(RIDES)('$name keeps zone 7 efforts to 60 s or less outside an FTP test', (ride: Ride) => {
    // Arrange / Act
    const efforts: RideInterval[] = ride.intervals.filter((i, index) => i.zone === 7 && index !== ride.ftpTest?.intervalIndex);

    // Assert
    for (const effort of efforts) {
      expect(effort.seconds).toBeLessThanOrEqual(60);
    }
  });

  it.each(LENGTHS)('%i s rides do more work at zone 5 and above, and at zone 6 and above, with each grade', (length: number) => {
    // Arrange
    const byGrade: Ride[][] = DIFFICULTIES.map((difficulty) => RIDES.filter((r) => r.lengthSeconds === length && r.difficulty === difficulty));

    // Act / Assert
    for (let index = 1; index < byGrade.length; index += 1) {
      expect(meanSecondsAtOrAbove(byGrade[index], 5), `grade ${index + 1} zone 5+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 5));
      expect(meanSecondsAtOrAbove(byGrade[index], 6), `grade ${index + 1} zone 6+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 6));
    }
    const easiest: number = Math.max(...byGrade[0].map((r) => secondsAtOrAbove(r, 5)));
    for (const ride of byGrade[4]) {
      expect(secondsAtOrAbove(ride, 5), ride.name).toBeGreaterThan(easiest);
    }
  });

  it.each(LENGTHS)('%i s rides bake in a 1, 3 and 5 minute FTP test as an all-out effort off a fresh lead-in', (length: number) => {
    // Arrange
    const tested: Ride[] = RIDES.filter((r) => r.lengthSeconds === length && r.ftpTest !== undefined);

    // Act / Assert
    expect(new Set(tested.map((r) => r.ftpTest?.seconds))).toEqual(new Set([60, 180, 300]));
    for (const ride of tested) {
      const { intervalIndex, seconds } = ride.ftpTest as { intervalIndex: number; seconds: number };
      const effort: RideInterval = ride.intervals[intervalIndex];
      expect(effort.seconds, ride.name).toBe(seconds);
      expect(effort.zone, ride.name).toBeGreaterThanOrEqual(6);
      expect(ride.intervals[intervalIndex - 1].zone, ride.name).toBeLessThanOrEqual(4);
      expect(ride.intervals[intervalIndex + 1].zone, ride.name).toBeLessThanOrEqual(3);
      expect(ride.intervals[intervalIndex + 1].seconds, ride.name).toBeGreaterThanOrEqual(Math.max(120, seconds / 2));
    }
  });

  it('gives every ride of a length its own warm-up', () => {
    // Arrange
    const openings: string[] = RIDES.map((r) => `${r.lengthSeconds}:${JSON.stringify(r.intervals.slice(0, 5))}`);

    // Act / Assert
    expect(new Set(openings).size).toBe(RIDES.length);
  });

  it('has unique ids and names', () => {
    // Arrange / Act / Assert
    expect(new Set(RIDES.map((r) => r.id)).size).toBe(RIDES.length);
    expect(new Set(RIDES.map((r) => r.name)).size).toBe(RIDES.length);
  });
});
