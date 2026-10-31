import { describe, expect, it } from 'vitest';
import rideLoad from '@/lib/client/helpers/ride-load';
import type { Ride } from '@/lib/client/models/types';

const steady: Ride = {
  id: 'steady',
  name: 'Steady',
  lengthSeconds: 3600,
  difficulty: 1,
  archetype: 'endurance',
  intervals: [{ zone: 3, seconds: 3600 }],
};

describe('rideLoad', () => {
  it('scores a steady tempo hour from the zone midpoint', () => {
    const load = rideLoad(steady);

    // Zone 3 midpoint is 83% of FTP, so IF is 0.83 and a one-hour ride is IF^2 * 100.
    expect(load.intensityFactor).toBeCloseTo(0.83, 5);
    expect(load.tss).toBeCloseTo(68.89, 2);
    expect(load.thresholdSeconds).toBe(0);
  });
});
