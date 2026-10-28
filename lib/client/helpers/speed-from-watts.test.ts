import { describe, expect, it } from 'vitest';
import speedFromWatts from '@/lib/client/helpers/speed-from-watts';

describe('speedFromWatts', () => {
  it('derives mph from watts', () => {
    // Arrange / Act / Assert
    expect(speedFromWatts(0)).toBe(0);
    expect(speedFromWatts(231)).toBeCloseTo(22.7, 0);
    expect(speedFromWatts(400)).toBeGreaterThan(speedFromWatts(231));
  });
});
