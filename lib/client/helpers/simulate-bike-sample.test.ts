import { describe, expect, it } from 'vitest';
import simulateBikeSample from '@/lib/client/helpers/simulate-bike-sample';

describe('simulateBikeSample', () => {
  it('keeps simulated watts and rpm inside the zone bands over time', () => {
    // Arrange / Act / Assert
    for (let now = 0; now < 60000; now += 250) {
      const zoneFive = simulateBikeSample(5, 200, now);
      expect(zoneFive.watts).toBeGreaterThanOrEqual(182);
      expect(zoneFive.watts).toBeLessThanOrEqual(212);
      expect(zoneFive.rpm).toBeGreaterThanOrEqual(85);
      expect(zoneFive.rpm).toBeLessThanOrEqual(95);
      expect(zoneFive.receivedAt).toBe(now);
      expect(simulateBikeSample(2, 200, now).watts).toBeGreaterThanOrEqual(80);
      expect(simulateBikeSample(2, 200, now).watts).toBeLessThanOrEqual(112);
      expect(simulateBikeSample(7, 200, now).watts).toBeGreaterThanOrEqual(242);
    }
  });
});
