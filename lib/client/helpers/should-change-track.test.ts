import { beforeEach, describe, expect, it, vi } from 'vitest';
import shouldChangeTrack from '@/lib/client/helpers/should-change-track';

describe('shouldChangeTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decides whether to change track', () => {
    // Arrange / Act / Assert
    expect(shouldChangeTrack(2, 5, 30, () => 0)).toBe(false);
    expect(shouldChangeTrack(4, 4, 120, () => 0)).toBe(false);
    expect(shouldChangeTrack(3, 4, 120, () => 0.4)).toBe(true);
    expect(shouldChangeTrack(3, 4, 120, () => 0.6)).toBe(false);
    expect(shouldChangeTrack(2, 5, 120, () => 0.7)).toBe(true);
    expect(shouldChangeTrack(2, 5, 120, () => 0.9)).toBe(false);
  });
});
