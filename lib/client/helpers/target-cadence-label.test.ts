import { describe, expect, it } from 'vitest';
import targetCadenceLabel from '@/lib/client/helpers/target-cadence-label';

describe('targetCadenceLabel', () => {
  it('names the target for the zones that were planned', () => {
    // Arrange
    const zones = [0, 40, 0, 20, 0, 0, 0];

    // Act
    const label = targetCadenceLabel(zones);

    // Assert
    expect(label).toBe('70–85 rpm');
  });

  it('returns nothing when no planned zone was ridden', () => {
    // Act
    const label = targetCadenceLabel([0, 0, 0, 0, 0, 0, 0]);

    // Assert
    expect(label).toBeNull();
  });
});
