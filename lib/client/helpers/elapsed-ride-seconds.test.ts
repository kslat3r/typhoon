import { describe, expect, it } from 'vitest';
import elapsedRideSeconds from '@/lib/client/helpers/elapsed-ride-seconds';

describe('elapsedRideSeconds', () => {
  it('uses the ridden time when the workout was longer', () => {
    // Act
    const seconds = elapsedRideSeconds({ durationSeconds: 754, plannedSeconds: 1800 });

    // Assert
    expect(seconds).toBe(754);
  });

  it('uses durationSeconds when an older save has no planned length', () => {
    // Act
    const seconds = elapsedRideSeconds({ durationSeconds: 754 });

    // Assert
    expect(seconds).toBe(754);
  });
});
