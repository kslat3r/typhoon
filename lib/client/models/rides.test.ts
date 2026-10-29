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

  it.each(RIDES)('$name warms up and cools down in zone 2', (ride: Ride) => {
    // Arrange / Act
    const first = ride.intervals[0];
    const last = ride.intervals[ride.intervals.length - 1];

    // Assert
    expect(first.zone).toBe(2);
    expect(first.seconds).toBeGreaterThanOrEqual(180);
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

  it.each(RIDES.filter((r) => r.difficulty === 1))('$name keeps the easiest grade at zone 6 or below with short zone 6 efforts', (ride: Ride) => {
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
    const byGrade: Ride[][] = DIFFICULTIES.map((difficulty) => RIDES.filter((r) => r.lengthSeconds === length && r.difficulty === difficulty));

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
