import { beforeEach, describe, expect, it } from 'vitest';
import renderRideProfile from '@/components/RideProfile';
import type { IntervalPosition, Ride } from '@/lib/client/models/types';

const ride: Ride = {
  id: 'test',
  name: 'Test',
  lengthSeconds: 600,
  difficulty: 1,
  archetype: 'steady',
  intervals: [
    { zone: 2, seconds: 200 },
    { zone: 4, seconds: 200 },
    { zone: 6, seconds: 200 },
  ],
} as unknown as Ride;

const position: IntervalPosition = {
  index: 1,
  interval: ride.intervals[1],
  secondsIntoInterval: 100,
  secondsLeftInInterval: 100,
  secondsLeftInRide: 300,
};

describe('renderRideProfile', () => {
  let root: HTMLElement;

  beforeEach((): void => {
    root = document.createElement('div');
  });

  it('draws one rect per interval', (): void => {
    renderRideProfile(root, { ride, position: null, percentOfFtp: null });

    expect(root.querySelectorAll('rect').length).toBe(3);
  });

  it('strokes the current rect', (): void => {
    renderRideProfile(root, { ride, position, percentOfFtp: null });

    const current: Element = root.querySelectorAll('rect')[1];
    expect(current.getAttribute('stroke')).toBe('#ffffff');
    expect(current.getAttribute('class')).toBe('ride-profile-bar ride-profile-bar-current');
    expect(root.querySelectorAll('rect')[0].getAttribute('fill-opacity')).toBe('0.45');
  });

  it('omits the circle when percentOfFtp is null', (): void => {
    renderRideProfile(root, { ride, position, percentOfFtp: null });

    expect(root.querySelector('circle')).toBeNull();
  });

  it('places the circle inside the zone 4 band at 100 percent', (): void => {
    renderRideProfile(root, { ride, position, percentOfFtp: 100 });

    const circle: Element | null = root.querySelector('circle');
    const fraction: number = (100 - 91) / (106 - 91);
    const expected: number = 300 - ((3 + fraction) / 7) * 300;
    expect(circle).not.toBeNull();
    expect(Number(circle?.getAttribute('cy'))).toBeCloseTo(expected, 5);
    expect(Number(circle?.getAttribute('cy'))).toBeGreaterThan(300 - (4 / 7) * 300);
    expect(Number(circle?.getAttribute('cy'))).toBeLessThan(300 - (3 / 7) * 300);
  });
});
