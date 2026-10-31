import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER } from '@/lib/client/models/difficulty-labels';
import { RIDES } from '@/lib/client/models/rides';
import type { Difficulty, Ride, RideInterval } from '@/lib/client/models/types';

const LENGTHS: number[] = [1800, 2700];
const CLASSIC_DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];
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
    let trailingRest = 0;
    for (let index = ride.intervals.length - 1; index >= 0; index -= 1) {
      if (ride.intervals[index].zone !== 1) {
        break;
      }
      trailingRest += ride.intervals[index].seconds;
    }
    expect(last.zone).toBe(1);
    expect(last.seconds).toBe(120);
    expect(trailingRest).toBe(120);
  });

  it.each(RIDES)('$name rests in blue after work, green only as active easy riding', (ride: Ride) => {
    // Arrange / Act
    const greenAfterWork = ride.intervals.filter((interval, index) => index > 0 && interval.zone === 2 && ride.intervals[index - 1].zone >= 4);

    // Assert
    expect(greenAfterWork).toEqual([]);
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
      for (const difficulty of DIFFICULTY_ORDER) {
        const count: number = RIDES.filter((r) => r.lengthSeconds === length && r.difficulty === difficulty).length;
        expect(count, `${length} s at difficulty ${difficulty}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it.each(RIDES.filter((r) => r.difficulty === 6))('$name stays Light: zones 1–3, with some zone 3 and no zone 4+', (ride: Ride) => {
    // Arrange / Act / Assert
    expect(Math.max(...ride.intervals.map((interval) => interval.zone))).toBeLessThanOrEqual(3);
    expect(ride.intervals.some((interval) => interval.zone === 3)).toBe(true);
    expect(secondsAtOrAbove(ride, 4)).toBe(0);
  });

  it.each(RIDES.filter((r) => r.difficulty === 7))('$name stays Easy: mostly under zone 4, with brief zone 4 and no zone 5+', (ride: Ride) => {
    // Arrange / Act
    const zoneFour: RideInterval[] = ride.intervals.filter((interval) => interval.zone === 4);

    // Assert
    expect(Math.max(...ride.intervals.map((interval) => interval.zone))).toBeLessThanOrEqual(4);
    expect(zoneFour.length).toBeGreaterThan(0);
    expect(secondsAtOrAbove(ride, 5)).toBe(0);
    for (const interval of zoneFour) {
      expect(interval.seconds).toBeLessThanOrEqual(30);
    }
  });

  it.each(RIDES.filter((r) => r.difficulty === 8))('$name stays Average: zone 5 in short blocks and nothing above it', (ride: Ride) => {
    // Arrange / Act
    const zoneFive: RideInterval[] = ride.intervals.filter((interval) => interval.zone === 5);

    // Assert
    expect(Math.max(...ride.intervals.map((interval) => interval.zone))).toBe(5);
    expect(zoneFive.length).toBeGreaterThan(0);
    for (const interval of zoneFive) {
      expect(interval.seconds).toBeLessThanOrEqual(25);
    }
  });

  it.each(RIDES.filter((r) => r.difficulty === 9))('$name stays Moderate: some zone 5, one short zone 6, and no zone 7', (ride: Ride) => {
    // Arrange / Act
    const zoneSix: RideInterval[] = ride.intervals.filter((interval) => interval.zone === 6);

    // Assert
    expect(ride.intervals.some((interval) => interval.zone === 5)).toBe(true);
    expect(zoneSix).toHaveLength(1);
    expect(zoneSix[0].seconds).toBeLessThanOrEqual(15);
    expect(ride.intervals.some((interval) => interval.zone === 7)).toBe(false);
  });

  it.each(RIDES.filter((r) => r.difficulty === 1))('$name keeps Challenging at zone 6 or below with short zone 6 efforts', (ride: Ride) => {
    // Arrange / Act
    const zoneSix: RideInterval[] = ride.intervals.filter((i) => i.zone === 6);

    // Assert
    expect(Math.max(...ride.intervals.map((i) => i.zone))).toBeLessThanOrEqual(6);
    for (const interval of zoneSix) {
      expect(interval.seconds).toBeLessThanOrEqual(30);
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

  it.each(LENGTHS)('%i s rides do more work at zone 4 and above, and at zone 5 and above, with each grade', (length: number) => {
    // Arrange
    const byGrade: Ride[][] = CLASSIC_DIFFICULTIES.map((difficulty) => ridesAt(length, difficulty));

    // Act / Assert
    for (let index = 1; index < byGrade.length; index += 1) {
      expect(meanSecondsAtOrAbove(byGrade[index], 4), `grade ${index + 1} zone 4+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 4));
      expect(meanSecondsAtOrAbove(byGrade[index], 5), `grade ${index + 1} zone 5+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 5));
    }
    const easiest: number = Math.max(...byGrade[0].map((r) => secondsAtOrAbove(r, 4)));
    for (const ride of byGrade[4]) {
      expect(secondsAtOrAbove(ride, 4), ride.name).toBeGreaterThan(easiest);
    }
  });

  it.each(LENGTHS)('%i s grades rise from Light through Brutal in intensity and time at zone 4+', (length: number) => {
    // Arrange
    const byGrade: Ride[][] = DIFFICULTY_ORDER.map((difficulty) => ridesAt(length, difficulty));

    // Act / Assert
    for (let index = 1; index < byGrade.length; index += 1) {
      const label: string = `${DIFFICULTY_ORDER[index]} above ${DIFFICULTY_ORDER[index - 1]}`;
      expect(meanIntensity(byGrade[index]), `${label} intensity`).toBeGreaterThan(meanIntensity(byGrade[index - 1]));
      expect(meanSecondsAtOrAbove(byGrade[index], 4), `${label} zone 4+`).toBeGreaterThan(meanSecondsAtOrAbove(byGrade[index - 1], 4));
    }
    for (let index = 2; index < byGrade.length; index += 1) {
      expect(meanSecondsAtOrAbove(byGrade[index], 5), `${DIFFICULTY_ORDER[index]} zone 5+`).toBeGreaterThan(
        meanSecondsAtOrAbove(byGrade[index - 1], 5),
      );
    }
    const moderate: Ride[] = ridesAt(length, 9);
    const challenging: Ride[] = ridesAt(length, 1);
    expect(Math.max(...moderate.map((ride) => secondsAtOrAbove(ride, 4)))).toBeLessThan(Math.min(...challenging.map((ride) => secondsAtOrAbove(ride, 4))));
    expect(Math.max(...moderate.map(intensity))).toBeLessThan(Math.min(...challenging.map(intensity)));
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

  it('gives every ride of a length its own warm-up', () => {
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
