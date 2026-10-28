import { beforeEach, describe, expect, it, vi } from 'vitest';
import pickTrack from '@/lib/client/helpers/pick-track';
import type { Track } from '@/lib/client/models/types';

function track(id: string): Track {
  return { id, uri: `spotify:track:${id}`, name: id, artist: 'artist', artworkUrl: '', durationMs: 180000 };
}

describe('pickTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('picks a fitting track and avoids the excluded one', () => {
    // Arrange
    const tracks = [track('a'), track('b'), track('c')];
    const tempos = { a: 90, b: 130, c: null };

    // Act / Assert
    expect(pickTrack(tracks, tempos, 3, 'a', () => 0).id).toBe('c');
    expect(pickTrack(tracks, tempos, 3, null, () => 0).id).toBe('a');
  });

  it('still returns a track when nothing fits', () => {
    // Arrange
    const tracks = [track('a')];

    // Act / Assert
    expect(pickTrack(tracks, { a: 200 }, 2, 'a', () => 0).id).toBe('a');
  });

  it('throws when there are no tracks', () => {
    // Act / Assert
    expect(() => pickTrack([], {}, 2, null, () => 0)).toThrow('No tracks to pick from');
  });
});
