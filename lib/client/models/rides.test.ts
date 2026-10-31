import { describe, expect, it } from 'vitest';
import rideLoad from '@/lib/client/helpers/ride-load';
import { DIFFICULTY_ORDER } from '@/lib/client/models/difficulty-labels';
import { RIDES } from '@/lib/client/models/rides';
import type { Difficulty, Ride, RideInterval } from '@/lib/client/models/types';

const LENGTHS: number[] = [1800, 2700];
// Longest allowed effort per zone for each grade, in seconds. A zone missing here is not allowed at all.
const EFFORT_CAPS: Record<Difficulty, Record<number, number>> = {
  1: { 4: 20 },
  2: { 4: 600, 5: 20 },
  3: { 4: 600, 5: 30, 6: 15 },
  4: { 4: 600, 5: 45, 6: 20, 7: 10 },
  5: { 4: 600, 5: 60, 6: 30, 7: 15 },
};
function secondsAtOrAbove(ride: Ride, zone: number): number {
  return ride.intervals.filter((i) => i.zone >= zone).reduce((sum, i) => sum + i.seconds, 0);
}

function ridesAt(length: number, difficulty: Difficulty): Ride[] {
  return RIDES.filter((ride) => ride.lengthSeconds === length && ride.difficulty === difficulty);
}

describe('ride library', () => {
  it('has fifty rides and at least two of every grade at both lengths', () => {
    // Arrange / Act / Assert
    expect(RIDES).toHaveLength(50);
    for (const length of LENGTHS) {
      for (const difficulty of DIFFICULTY_ORDER) {
        expect(ridesAt(length, difficulty).length, `${length} s at difficulty ${difficulty}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each(RIDES)('$name sums to its length', (ride: Ride) => {
    // Arrange / Act
    const total: number = ride.intervals.reduce((sum, i) => sum + i.seconds, 0);

    // Assert
    expect(total).toBe(ride.lengthSeconds);
    expect(LENGTHS).toContain(ride.lengthSeconds);
  });

  it.each(RIDES)('$name opens with a zone 1 spin, a varied warm-up inside four minutes and cools down for 2 minutes', (ride: Ride) => {
    // Arrange / Act
    const spin = ride.intervals[0];
    const last = ride.intervals[ride.intervals.length - 1];
    const head: RideInterval[] = [];
    let elapsed = 0;
    for (const interval of ride.intervals) {
      if (elapsed >= 240) {
        break;
      }
      head.push(interval);
      elapsed += interval.seconds;
    }
    const hardSeconds = head.filter((i) => i.zone >= 5).reduce((sum, i) => sum + i.seconds, 0);

    // Assert
    expect(spin.zone).toBe(1);
    expect(spin.seconds).toBeGreaterThanOrEqual(45);
    expect(spin.seconds).toBeLessThanOrEqual(90);
    expect(head.length).toBeGreaterThanOrEqual(4);
    expect(new Set(head.map((i) => i.zone)).size).toBeGreaterThanOrEqual(3);
    expect(hardSeconds).toBeLessThanOrEqual(45);
    expect(last.zone).toBe(1);
    expect(last.seconds).toBe(120);
    expect(ride.intervals[ride.intervals.length - 2].zone).not.toBe(1);
  });

  it.each(RIDES)('$name rests in blue after work, green only as active easy riding', (ride: Ride) => {
    // Arrange / Act
    const greenAfterWork = ride.intervals.filter((interval, index) => index > 0 && interval.zone === 2 && ride.intervals[index - 1].zone >= 4);

    // Assert
    expect(greenAfterWork).toEqual([]);
  });

  it.each(RIDES)('$name varies its interval shapes and never repeats a zone back to back', (ride: Ride) => {
    // Arrange / Act
    const durations: Set<number> = new Set(ride.intervals.map((i) => i.seconds));
    const repeats = ride.intervals.filter((interval, index) => index > 0 && interval.zone === ride.intervals[index - 1].zone);

    // Assert
    expect(durations.size).toBeGreaterThanOrEqual(4);
    expect(ride.intervals.some((i) => i.seconds <= 30)).toBe(true);
    expect(ride.intervals.length).toBeGreaterThanOrEqual(10);
    expect(repeats).toEqual([]);
  });

  it.each(RIDES)('$name keeps every effort inside its grade\'s ceiling, the FTP test effort aside', (ride: Ride) => {
    // Arrange
    const caps: Record<number, number> = EFFORT_CAPS[ride.difficulty];
    const efforts: RideInterval[] = ride.intervals.filter((interval, index) => index !== ride.ftpTest?.intervalIndex && interval.zone >= 4);

    // Act / Assert
    for (const effort of efforts) {
      const cap: number | undefined = caps[effort.zone];
      expect(cap, `${ride.name} has zone ${effort.zone}`).toBeDefined();
      expect(effort.seconds, `${ride.name} zone ${effort.zone}`).toBeLessThanOrEqual(cap as number);
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

  it('grades are strictly monotonic with intensity factor', () => {
    // Arrange
    const slowBurn: Ride | undefined = RIDES.find((ride) => ride.name === 'Slow Burn');
    const flatOut: Ride | undefined = RIDES.find((ride) => ride.name === 'Flat Out');

    // Act / Assert
    expect(slowBurn?.difficulty).toBe(3);
    expect(flatOut?.difficulty).toBe(4);
    for (let index = 1; index < DIFFICULTY_ORDER.length; index += 1) {
      const lower = RIDES.filter((ride) => ride.difficulty === DIFFICULTY_ORDER[index - 1]).map((ride) => rideLoad(ride).intensityFactor);
      const higher = RIDES.filter((ride) => ride.difficulty === DIFFICULTY_ORDER[index]).map((ride) => rideLoad(ride).intensityFactor);
      expect(Math.max(...lower), `grade ${DIFFICULTY_ORDER[index]}`).toBeLessThan(Math.min(...higher));
    }
    const easiest: number = Math.max(...RIDES.filter((ride) => ride.difficulty === 1).map((ride) => secondsAtOrAbove(ride, 4)));
    for (const ride of RIDES.filter((ride) => ride.difficulty === 5)) {
      expect(secondsAtOrAbove(ride, 4), ride.name).toBeGreaterThan(easiest);
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
      expect(effort.zone, ride.name).toBeGreaterThanOrEqual(5);
      expect(ride.intervals[intervalIndex - 1].zone, ride.name).toBeLessThanOrEqual(3);
      expect(ride.intervals[intervalIndex + 1].zone, ride.name).toBeLessThanOrEqual(2);
      expect(ride.intervals[intervalIndex + 1].seconds, ride.name).toBeGreaterThanOrEqual(Math.max(120, seconds / 2));
    }
  });

  it('gives every ride of a length its own opening', () => {
    // Arrange
    const openings: string[] = RIDES.map((r) => `${r.lengthSeconds}:${JSON.stringify(r.intervals.slice(0, 8))}`);

    // Act / Assert
    expect(new Set(openings).size).toBe(RIDES.length);
  });

  it('has unique ids and names', () => {
    // Arrange / Act / Assert
    expect(new Set(RIDES.map((r) => r.id)).size).toBe(RIDES.length);
    expect(new Set(RIDES.map((r) => r.name)).size).toBe(RIDES.length);
  });
});
