import { describe, expect, it, vi } from 'vitest';
import lockLandscape from '@/lib/client/helpers/lock-landscape';

describe('lockLandscape', () => {
  it('asks an installed app to stay landscape', () => {
    // Arrange
    const lock = vi.fn(() => Promise.resolve());

    // Act
    lockLandscape({ lock }, true);

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('leaves a normal browser tab alone', () => {
    // Arrange
    const lock = vi.fn(() => Promise.resolve());

    // Act
    lockLandscape({ lock }, false);

    // Assert
    expect(lock).not.toHaveBeenCalled();
  });

  it('ignores a browser that refuses the lock', async () => {
    // Arrange
    const lock = vi.fn(() => Promise.reject(new Error('not allowed')));

    // Act
    lockLandscape({ lock }, true);
    await Promise.resolve();

    // Assert
    expect(lock).toHaveBeenCalledWith('landscape');
  });
});
