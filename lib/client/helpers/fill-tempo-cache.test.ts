import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fillTempoCache from '@/lib/client/helpers/fill-tempo-cache';
import lookupTempo from '@/lib/client/helpers/lookup-tempo';
import saveTempoCache from '@/lib/client/helpers/save-tempo-cache';
import type { Track } from '@/lib/client/models/types';

vi.mock('@/lib/client/helpers/lookup-tempo');
vi.mock('@/lib/client/helpers/save-tempo-cache');

function track(id: string): Track {
  return { id, uri: `spotify:track:${id}`, name: id, artist: 'artist', artworkUrl: '', durationMs: 180000 };
}

describe('fillTempoCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips cached ids, waits between lookups, saves and reports progress', async () => {
    // Arrange
    vi.mocked(lookupTempo).mockResolvedValueOnce(120).mockResolvedValueOnce(null);
    const onProgress = vi.fn();
    const input = { a: 90 };

    // Act
    const promise = fillTempoCache('key', [track('a'), track('b'), track('c')], input, onProgress);
    await vi.advanceTimersByTimeAsync(0);
    expect(lookupTempo).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1099);
    expect(lookupTempo).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;

    // Assert
    expect(lookupTempo).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ a: 90, b: 120, c: null });
    expect(input).toEqual({ a: 90 });
    expect(saveTempoCache).toHaveBeenCalledTimes(2);
    expect(saveTempoCache).toHaveBeenLastCalledWith({ a: 90, b: 120, c: null });
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('leaves a failed lookup out of the cache and continues', async () => {
    // Arrange
    vi.mocked(lookupTempo).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(100);

    // Act
    const promise = fillTempoCache('key', [track('a'), track('b')], {}, vi.fn());
    await vi.advanceTimersByTimeAsync(1100);
    const result = await promise;

    // Assert
    expect(result).toEqual({ b: 100 });
  });

  it('reports progress for failed lookups too', async () => {
    // Arrange
    vi.mocked(lookupTempo).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(100);
    const onProgress = vi.fn();

    // Act
    const promise = fillTempoCache('key', [track('a'), track('b')], {}, onProgress);
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    // Assert
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('rejects on an unauthorised lookup without saving', async () => {
    // Arrange
    vi.mocked(lookupTempo).mockRejectedValueOnce(new Error('Tempo lookup unauthorised: 401'));
    const onProgress = vi.fn();

    // Act / Assert
    await expect(fillTempoCache('key', [track('a'), track('b')], {}, onProgress)).rejects.toThrow('Tempo lookup unauthorised');
    expect(saveTempoCache).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('rejects when every lookup fails', async () => {
    // Arrange
    vi.mocked(lookupTempo)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const onProgress = vi.fn();

    // Act
    const promise = fillTempoCache('key', [track('a'), track('b')], {}, onProgress);
    const assertion = expect(promise).rejects.toThrow('Tempo lookup failed: every request failed');
    await vi.advanceTimersByTimeAsync(1100);

    // Assert
    await assertion;
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});
