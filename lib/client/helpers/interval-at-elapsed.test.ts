import { describe, expect, it } from 'vitest';
import intervalAtElapsed from '@/lib/client/helpers/interval-at-elapsed';
import type { Ride } from '@/lib/client/models/types';

const ride: Ride = {
  id: 't',
  name: 'T',
  lengthSeconds: 1800,
  difficulty: 1,
  archetype: 'endurance',
  intervals: [
    { zone: 2, seconds: 300 },
    { zone: 4, seconds: 60 },
    { zone: 2, seconds: 1440 },
  ],
};

describe('intervalAtElapsed', () => {
  it('locates the interval for an elapsed time', () => {
    // Arrange / Act / Assert
    expect(intervalAtElapsed(ride, 0)).toMatchObject({ index: 0, secondsLeftInInterval: 300, secondsLeftInRide: 1800 });
    expect(intervalAtElapsed(ride, 299.5)).toMatchObject({ index: 0, secondsLeftInInterval: 0.5 });
    expect(intervalAtElapsed(ride, 300)).toMatchObject({ index: 1, secondsIntoInterval: 0 });
    expect(intervalAtElapsed(ride, 1800)).toBeNull();
  });

  it('reports the seconds left in the ride inside the last interval', () => {
    // Arrange / Act
    const position = intervalAtElapsed(ride, 1700);

    // Assert
    expect(position).toMatchObject({ index: 2, secondsIntoInterval: 1340, secondsLeftInInterval: 100, secondsLeftInRide: 100 });
  });

  it('treats a negative elapsed time as zero', () => {
    // Arrange / Act / Assert
    expect(intervalAtElapsed(ride, -5)).toMatchObject({ index: 0, secondsIntoInterval: 0 });
  });
});
