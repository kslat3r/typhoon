import { beforeEach, describe, expect, it, vi } from 'vitest';
import fillTempoCache from '@/lib/client/helpers/fill-tempo-cache';
import lookupTempos from '@/lib/client/helpers/lookup-tempos';
import saveTempoCache from '@/lib/client/helpers/save-tempo-cache';
import type { Track } from '@/lib/client/models/types';

vi.mock('@/lib/client/helpers/lookup-tempos');
vi.mock('@/lib/client/helpers/save-tempo-cache');

function track(id: string): Track {
  return { id, uri: `spotify:track:${id}`, name: id, artist: 'artist', artworkUrl: '', durationMs: 180000 };
}

describe('fillTempoCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips cached ids, marks unmatched ids null, saves and reports progress', async () => {
    // Arrange
    vi.mocked(lookupTempos).mockResolvedValueOnce({ b: 120 });
    const onProgress = vi.fn();
    const input = { a: 90 };

    // Act
    const result = await fillTempoCache([track('a'), track('b'), track('c')], input, onProgress);

    // Assert
    expect(lookupTempos).toHaveBeenCalledTimes(1);
    expect(lookupTempos).toHaveBeenCalledWith(['b', 'c']);
    expect(result).toEqual({ a: 90, b: 120, c: null });
    expect(input).toEqual({ a: 90 });
    expect(saveTempoCache).toHaveBeenCalledTimes(1);
    expect(saveTempoCache).toHaveBeenLastCalledWith({ a: 90, b: 120, c: null });
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it('splits lookups into batches of 40', async () => {
    // Arrange
    vi.mocked(lookupTempos).mockResolvedValue({});
    const tracks = Array.from({ length: 41 }, (_, index) => track(`t${index}`));
    const onProgress = vi.fn();

    // Act
    await fillTempoCache(tracks, {}, onProgress);

    // Assert
    expect(lookupTempos).toHaveBeenCalledTimes(2);
    expect(vi.mocked(lookupTempos).mock.calls[0][0]).toHaveLength(40);
    expect(vi.mocked(lookupTempos).mock.calls[1][0]).toEqual(['t40']);
    expect(onProgress).toHaveBeenNthCalledWith(1, 40, 41);
    expect(onProgress).toHaveBeenNthCalledWith(2, 41, 41);
  });

  it('leaves a failed batch out of the cache, reports its progress and continues', async () => {
    // Arrange
    vi.mocked(lookupTempos).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ t40: 100 });
    const tracks = Array.from({ length: 41 }, (_, index) => track(`t${index}`));
    const onProgress = vi.fn();

    // Act
    const result = await fillTempoCache(tracks, {}, onProgress);

    // Assert
    expect(result).toEqual({ t40: 100 });
    expect(onProgress).toHaveBeenNthCalledWith(1, 40, 41);
    expect(onProgress).toHaveBeenNthCalledWith(2, 41, 41);
  });

  it('rejects when every lookup fails', async () => {
    // Arrange
    vi.mocked(lookupTempos).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    // Act / Assert
    await expect(fillTempoCache([track('a'), track('b')], {}, vi.fn())).rejects.toThrow('Tempo lookup failed: every request failed');
    expect(saveTempoCache).not.toHaveBeenCalled();
  });
});
