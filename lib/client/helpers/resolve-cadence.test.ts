import { describe, expect, it } from 'vitest';
import { emptyCrankCadenceState, preferCadence, updateCrankCadence } from '@/lib/client/helpers/resolve-cadence';
import type { PowerMeasurement } from '@/lib/client/models/types';

function crank(revolutions: number, eventTime: number): PowerMeasurement {
  return { watts: 200, crankRevolutions: revolutions, crankEventTime: eventTime };
}

describe('updateCrankCadence', () => {
  it('computes cadence once the crank event moves', () => {
    // Arrange
    const state = emptyCrankCadenceState();
    updateCrankCadence(state, crank(100, 0), 0);

    // Act
    const rpm = updateCrankCadence(state, crank(103, 2048), 1000);

    // Assert - 3 revolutions in 2 seconds
    expect(rpm).toBe(90);
  });

  it('holds the last cadence when the bike repeats the same crank event', () => {
    // Arrange
    const state = emptyCrankCadenceState();
    updateCrankCadence(state, crank(100, 0), 0);
    updateCrankCadence(state, crank(103, 2048), 1000);

    // Act
    const held = updateCrankCadence(state, crank(103, 2048), 1500);
    const stopped = updateCrankCadence(state, crank(103, 2048), 4000);

    // Assert
    expect(held).toBe(90);
    expect(stopped).toBe(0);
    expect(state.rpm).toBe(0);
  });

  it('leaves cadence unset when the power packet has no crank fields', () => {
    // Arrange
    const state = emptyCrankCadenceState();
    const powerOnly: PowerMeasurement = { watts: 240, crankRevolutions: null, crankEventTime: null };

    // Act / Assert
    expect(updateCrankCadence(state, powerOnly, 0)).toBeNull();
    expect(updateCrankCadence(state, powerOnly, 500)).toBeNull();
  });
});

describe('preferCadence', () => {
  it('uses a fresh FTMS cadence ahead of the crank estimate', () => {
    // Arrange / Act / Assert
    expect(preferCadence(90.5, 1000, 80, 1500)).toBe(91);
    expect(preferCadence(90.5, 1000, 80, 4000)).toBe(80);
    expect(preferCadence(null, 0, null, 0)).toBeNull();
  });
});
