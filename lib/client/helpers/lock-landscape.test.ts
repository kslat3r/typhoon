import { describe, expect, it, vi } from 'vitest';
import { lockRideLandscape, unlockRideOrientation } from '@/lib/client/helpers/lock-landscape';

describe('ride orientation', () => {
  it('asks the ride screen to stay landscape', () => {
    // Arrange
    const lock = vi.fn(() => Promise.resolve());

    // Act
    lockRideLandscape({ lock });

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('ignores a browser that rejects the lock', async () => {
    // Arrange
    const lock = vi.fn(() => Promise.reject(new Error('not allowed')));

    // Act
    lockRideLandscape({ lock });
    await Promise.resolve();

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('ignores a browser that throws from the lock', () => {
    // Arrange
    const lock = vi.fn(() => {
      throw new Error('not allowed');
    });

    // Act
    lockRideLandscape({ lock });

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('does nothing when the browser has no lock', () => {
    // Act
    lockRideLandscape(undefined);
    lockRideLandscape({});
  });

  it('releases the lock when leaving the ride', () => {
    // Arrange
    const unlock = vi.fn();

    // Act
    unlockRideOrientation({ unlock });

    // Assert
    expect(unlock).toHaveBeenCalledOnce();
  });

  it('ignores a browser that throws from unlock', () => {
    // Arrange
    const unlock = vi.fn(() => {
      throw new Error('not locked');
    });

    // Act
    unlockRideOrientation({ unlock });

    // Assert
    expect(unlock).toHaveBeenCalledOnce();
  });

  it('does nothing when the browser has no unlock', () => {
    // Act
    unlockRideOrientation(undefined);
    unlockRideOrientation({});
  });
});
