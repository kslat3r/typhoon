import { beforeEach, describe, expect, it, vi } from 'vitest';
import trackFitsZone from '@/lib/client/helpers/track-fits-zone';

describe('trackFitsZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fits a track by bpm, half or double', () => {
    // Arrange / Act / Assert
    expect(trackFitsZone(90, 3)).toBe(true);
    expect(trackFitsZone(180, 3)).toBe(true);
    expect(trackFitsZone(45, 3)).toBe(true);
    expect(trackFitsZone(120, 3)).toBe(false);
    expect(trackFitsZone(null, 3)).toBe(false);
  });
});
