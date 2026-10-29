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

  it('picks the track nearest the band and avoids the excluded one', () => {
    // Arrange
    const tracks = [track('a'), track('b'), track('c')];
    const tempos = { a: 88, b: 130, c: null };

    // Act / Assert
    expect(pickTrack(tracks, tempos, 4, new Set(), null, () => 0).id).toBe('a');
    expect(pickTrack(tracks, tempos, 4, new Set(), 'a', () => 0).id).toBe('b');
  });

  it('spreads picks across the ten nearest tracks when few sit close to the band', () => {
    // Arrange: tempos 180, 177, 174 ... 147, so only the first five are within 8 bpm of the band
    const tracks = Array.from({ length: 12 }, (_, index) => track(`t${index}`));
    const tempos = Object.fromEntries(tracks.map((entry, index) => [entry.id, 180 - index * 3]));

    // Act / Assert
    expect(pickTrack(tracks, tempos, 4, new Set(), null, () => 0).id).toBe('t0');
    expect(pickTrack(tracks, tempos, 4, new Set(), null, () => 0.99).id).toBe('t9');
  });

  it('never repeats a played track until every track has played', () => {
    // Arrange
    const tracks = [track('a'), track('b'), track('c')];
    const tempos = { a: 88, b: 88, c: 130 };

    // Act / Assert
    expect(pickTrack(tracks, tempos, 4, new Set(['a']), 'b', () => 0).id).toBe('c');
    expect(pickTrack(tracks, tempos, 4, new Set(['a', 'b', 'c']), 'c', () => 0).id).toBe('a');
  });

  it('still returns a track when nothing fits', () => {
    // Arrange
    const tracks = [track('a')];

    // Act / Assert
    expect(pickTrack(tracks, { a: 200 }, 2, new Set(['a']), 'a', () => 0).id).toBe('a');
  });

  it('throws when there are no tracks', () => {
    // Act / Assert
    expect(() => pickTrack([], {}, 2, new Set(), null, () => 0)).toThrow('No tracks to pick from');
  });
});
