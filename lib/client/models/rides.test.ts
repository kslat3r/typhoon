import { describe, expect, it } from 'vitest';
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
const ZONE_MIDPOINT: number[] = [0, 27.5, 65.5, 83.5, 101, 118.5, 138.5, 160];

function secondsAtOrAbove(ride: Ride, zone: number): number {
  return ride.intervals.filter((i) => i.zone >= zone).reduce((sum, i) => sum + i.seconds, 0);
}

function meanSecondsAtOrAbove(rides: Ride[], zone: number): number {
  return rides.reduce((sum, ride) => sum + secondsAtOrAbove(ride, zone), 0) / rides.length;
}

function intensity(ride: Ride): number {
  const score: number = ride.intervals.reduce((sum, interval) => sum + ZONE_MIDPOINT[interval.zone] * interval.seconds, 0);
  return score / ride.lengthSeconds;
}

function meanIntensity(rides: Ride[]): number {
  return rides.reduce((sum, ride) => sum + intensity(ride), 0) / rides.length;
}

function ridesAt(length: number, difficulty: Difficulty): Ride[] {
  return RIDES.filter((ride) => ride.lengthSeconds === length && ride.difficulty === difficulty);
}

describe('ride library', () => {
  it('has fifty rides, five per grade per length', () => {
    // Arrange / Act / Assert
    expect(RIDES).toHaveLength(50);
    for (const length of LENGTHS) {
      for (const difficulty of DIFFICULTY_ORDER) {
        expect(ridesAt(length, difficulty), `${length} s at difficulty ${difficulty}`).toHaveLength(5);
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

  it.each(LENGTHS)('%i s grades rise from Gentle to Very hard in intensity and in time at zone 4+ and zone 5+', (length: number) => {
    // Arrange
    const byGrade: Ride[][] = DIFFICULTY_ORDER.map((difficulty) => ridesAt(length, difficulty));

    // Act / Assert
    for (let index = 1; index < byGrade.length; index += 1) {
      const label: string = `grade ${DIFFICULTY_ORDER[index]}`;
      expect(meanIntensity(byGrade[index]), `${label} intensity`).toBeGreaterThan(meanIntensity(byGrade[index - 1]));
      expect(meanSecondsAtOrAbove(byGrade[index], 4), `${label} zone 4+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 4));
      expect(meanSecondsAtOrAbove(byGrade[index], 5), `${label} zone 5+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 5));
    }
    const easiest: number = Math.max(...byGrade[0].map((r) => secondsAtOrAbove(r, 4)));
    for (const ride of byGrade[4]) {
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
