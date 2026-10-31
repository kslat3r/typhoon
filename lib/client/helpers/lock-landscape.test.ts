import { describe, expect, it, vi } from 'vitest';
import { lockLandscape } from '@/lib/client/helpers/lock-landscape';

describe('app orientation', () => {
  it('asks the whole app to stay landscape', () => {
    // Arrange
    const lock = vi.fn(() => Promise.resolve());

    // Act
    lockLandscape({ lock });

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('ignores a browser that rejects the lock', async () => {
    // Arrange
    const lock = vi.fn(() => Promise.reject(new Error('not allowed')));

    // Act
    lockLandscape({ lock });
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
    lockLandscape({ lock });

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('does nothing when the browser has no lock', () => {
    // Act
    lockLandscape(undefined);
    lockLandscape({});
  });
});
