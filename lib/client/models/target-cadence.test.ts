import { describe, expect, it } from 'vitest';
import { TARGET_RPM, targetRpmForZone } from '@/lib/client/models/target-cadence';
import type { ZoneNumber } from '@/lib/client/models/types';

const GUIDANCE: Record<ZoneNumber, readonly [number, number]> = {
  1: [85, 95],
  2: [85, 95],
  3: [90, 100],
  4: [70, 85],
  5: [100, 115],
  6: [100, 115],
  7: [100, 115],
};

describe('targetRpmForZone', () => {
  it('picks one cadence inside the guidance for each zone', () => {
    // Arrange
    const zones = [1, 2, 3, 4, 5, 6, 7] as const;

    // Act / Assert
    for (const zone of zones) {
      const [min, max] = GUIDANCE[zone];
      const rpm = targetRpmForZone(zone);
      expect(rpm).toBe(TARGET_RPM[zone]);
      expect(rpm).toBeGreaterThanOrEqual(min);
      expect(rpm).toBeLessThanOrEqual(max);
    }
  });

  it('drops cadence for the threshold climb and lifts it again for the sprints', () => {
    // Arrange / Act / Assert
    expect(targetRpmForZone(3)).toBe(100);
    expect(targetRpmForZone(4)).toBe(80);
    expect(targetRpmForZone(7)).toBe(115);
  });
});
