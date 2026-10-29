import { describe, expect, it } from 'vitest';
import bandStretchSeconds from '@/lib/client/helpers/band-stretch-seconds';
import type { Ride } from '@/lib/client/models/types';

const ride: Ride = {
  id: 'r',
  name: 'R',
  lengthSeconds: 330,
  difficulty: 1,
  archetype: 'climb',
  intervals: [
    { zone: 2, seconds: 60 },
    { zone: 3, seconds: 90 },
    { zone: 4, seconds: 60 },
    { zone: 5, seconds: 30 },
    { zone: 6, seconds: 30 },
    { zone: 2, seconds: 60 },
  ],
};

describe('bandStretchSeconds', () => {
  it('sums consecutive intervals that share a cadence band', () => {
    // Arrange / Act / Assert
    expect(bandStretchSeconds(ride, 0)).toBe(60);
    expect(bandStretchSeconds(ride, 1)).toBe(150);
    expect(bandStretchSeconds(ride, 2)).toBe(60);
    expect(bandStretchSeconds(ride, 3)).toBe(60);
    expect(bandStretchSeconds(ride, 5)).toBe(60);
  });
});
