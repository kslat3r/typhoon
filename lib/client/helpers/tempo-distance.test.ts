import { describe, expect, it } from 'vitest';
import tempoDistance from '@/lib/client/helpers/tempo-distance';

describe('tempoDistance', () => {
  it('is zero inside the band by bpm, half or double, and grows outside it', () => {
    // Arrange / Act / Assert
    expect(tempoDistance(88, 4)).toBe(0);
    expect(tempoDistance(176, 4)).toBe(0);
    expect(tempoDistance(44, 4)).toBe(0);
    expect(tempoDistance(100, 4)).toBe(10);
    expect(tempoDistance(75, 2)).toBe(0);
    expect(tempoDistance(81, 3)).toBe(0);
    expect(tempoDistance(null, 4)).toBe(Infinity);
  });
});
