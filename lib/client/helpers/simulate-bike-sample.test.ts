import { describe, expect, it } from 'vitest';
import simulateBikeSample from '@/lib/client/helpers/simulate-bike-sample';

describe('simulateBikeSample', () => {
  it('keeps simulated watts and rpm inside the zone bands over time', () => {
    // Arrange / Act / Assert
    for (let now = 0; now < 60000; now += 250) {
      const zoneFour = simulateBikeSample(4, 200, now);
      expect(zoneFour.watts).toBeGreaterThanOrEqual(182);
      expect(zoneFour.watts).toBeLessThanOrEqual(212);
      expect(zoneFour.rpm).toBeGreaterThanOrEqual(85);
      expect(zoneFour.rpm).toBeLessThanOrEqual(95);
      expect(zoneFour.receivedAt).toBe(now);
      expect(simulateBikeSample(2, 200, now).watts).toBeGreaterThanOrEqual(112);
      expect(simulateBikeSample(7, 200, now).watts).toBeGreaterThanOrEqual(302);
    }
  });
});
