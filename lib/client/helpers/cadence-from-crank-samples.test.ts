import { describe, expect, it } from 'vitest';
import cadenceFromCrankSamples from '@/lib/client/helpers/cadence-from-crank-samples';

describe('cadenceFromCrankSamples', () => {
  it('computes cadence from two crank samples', () => {
    // Arrange - 3 revs in 2 s
    const previous = { watts: 0, crankRevolutions: 100, crankEventTime: 0 };
    const current = { watts: 0, crankRevolutions: 103, crankEventTime: 2048 };

    // Act / Assert
    expect(cadenceFromCrankSamples(previous, current)).toBe(90);
  });

  it('handles the 16-bit rollover of both counters', () => {
    // Arrange - 3 revs, 2048 ticks
    const previous = { watts: 0, crankRevolutions: 65534, crankEventTime: 65000 };
    const current = { watts: 0, crankRevolutions: 1, crankEventTime: 1512 };

    // Act / Assert
    expect(cadenceFromCrankSamples(previous, current)).toBe(90);
  });

  it('returns 0 when the crank event time has not moved', () => {
    // Arrange
    const sample = { watts: 0, crankRevolutions: 50, crankEventTime: 1024 };

    // Act / Assert
    expect(cadenceFromCrankSamples(sample, sample)).toBe(0);
  });

  it('returns null without crank data', () => {
    // Arrange
    const sample = { watts: 100, crankRevolutions: null, crankEventTime: null };

    // Act / Assert
    expect(cadenceFromCrankSamples(sample, sample)).toBeNull();
  });
});
