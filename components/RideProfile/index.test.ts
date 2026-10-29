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

const BAR_WIDTH: number = (1000 - 2) / 3;
const LINE_X: number = BAR_WIDTH + 1 + BAR_WIDTH / 2;

describe('renderRideProfile', () => {
  let root: HTMLElement;

  beforeEach((): void => {
    root = document.createElement('div');
  });

  it('draws one bar per interval and nothing else before the ride starts', (): void => {
    renderRideProfile(root, { ride, position: null });

    expect(root.querySelectorAll('rect').length).toBe(3);
    expect(root.querySelectorAll('.ride-profile-bar').length).toBe(3);
    expect(root.querySelector('circle')).toBeNull();
  });

  it('scales bar height from zone 2 to zone 7', (): void => {
    renderRideProfile(root, { ride, position: null });

    const bars: NodeListOf<Element> = root.querySelectorAll('.ride-profile-bar');
    expect(Number(bars[0].getAttribute('height'))).toBeCloseTo(50, 5);
    expect(Number(bars[2].getAttribute('height'))).toBeCloseTo(250, 5);
  });

  it('masks the ridden part and draws the position line half way through the current interval', (): void => {
    renderRideProfile(root, { ride, position });

    const mask: Element | null = root.querySelector('.ride-profile-mask');
    const line: Element | null = root.querySelector('.ride-profile-line');
    expect(Number(mask?.getAttribute('width'))).toBeCloseTo(LINE_X, 5);
    expect(Number(line?.getAttribute('x'))).toBeCloseTo(LINE_X - 1.5, 5);
    expect(line?.getAttribute('height')).toBe('300');
    expect(root.querySelector('circle')).toBeNull();
  });
});
