import { describe, expect, it } from 'vitest';
import { TARGET_RPM, targetRpmForZone } from '@/lib/client/models/target-cadence';
import type { ZoneNumber } from '@/lib/client/models/types';

const EXPECTED: Record<ZoneNumber, number> = {
  1: 60,
  2: 70,
  3: 80,
  4: 85,
  5: 90,
  6: 100,
  7: 115,
};

describe('targetRpmForZone', () => {
  it('returns the cadence for each zone', () => {
    // Arrange
    const zones = [1, 2, 3, 4, 5, 6, 7] as const;

    // Act / Assert
    for (const zone of zones) {
      expect(targetRpmForZone(zone)).toBe(EXPECTED[zone]);
      expect(targetRpmForZone(zone)).toBe(TARGET_RPM[zone]);
    }
  });
});
