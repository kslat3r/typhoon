import { beforeEach, describe, expect, it, vi } from 'vitest';
import trackFitsZone from '@/lib/client/helpers/track-fits-zone';

describe('trackFitsZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fits a track by bpm, half or double', () => {
    // Arrange / Act / Assert
    expect(trackFitsZone(90, 4)).toBe(true);
    expect(trackFitsZone(180, 4)).toBe(true);
    expect(trackFitsZone(45, 4)).toBe(true);
    expect(trackFitsZone(120, 4)).toBe(false);
    expect(trackFitsZone(null, 4)).toBe(false);
  });
});
