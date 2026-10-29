import { describe, expect, it } from 'vitest';
import decideMusicAction from '@/lib/client/helpers/decide-music-action';
import type { MusicState, Track } from '@/lib/client/models/types';

function track(id: string): Track {
  return { id, uri: `spotify:track:${id}`, name: id, artist: 'artist', artworkUrl: null, durationMs: 180000 };
}

const TRACKS: Track[] = [track('a'), track('b')];
const PLAYING_A: MusicState = { track: track('a'), startedAt: 0, zone: 2 };

describe('decideMusicAction', () => {
  it('holds with no tracks and plays when nothing is playing', () => {
    // Arrange / Act / Assert
    expect(decideMusicAction({ track: null, startedAt: 0, zone: 2 }, 2, 0, [], {}, () => 0, 600)).toEqual({ kind: 'hold' });
    expect(decideMusicAction({ track: null, startedAt: 0, zone: 2 }, 2, 0, TRACKS, {}, () => 0, 600)).toEqual({ kind: 'play', track: track('a') });
  });

  it('holds while the cadence band is unchanged, however many zones are crossed', () => {
    // Arrange / Act / Assert
    expect(decideMusicAction({ ...PLAYING_A, zone: 1 }, 2, 600000, TRACKS, {}, () => 0, 600)).toEqual({ kind: 'hold' });
    expect(decideMusicAction({ ...PLAYING_A, zone: 3 }, 4, 600000, TRACKS, {}, () => 0, 600)).toEqual({ kind: 'hold' });
    expect(decideMusicAction({ ...PLAYING_A, zone: 5 }, 7, 600000, TRACKS, {}, () => 0, 600)).toEqual({ kind: 'hold' });
  });

  it('holds when the current track still fits the new zone by tempo', () => {
    // Arrange: 170 bpm halves to 85, inside the zone 3 to 4 band
    const tempos = { a: 170 };

    // Act / Assert
    expect(decideMusicAction(PLAYING_A, 4, 600000, TRACKS, tempos, () => 0, 600)).toEqual({ kind: 'hold' });
  });

  it('holds a track that has played under 90 seconds', () => {
    // Arrange / Act / Assert
    expect(decideMusicAction(PLAYING_A, 5, 89000, TRACKS, {}, () => 0, 600)).toEqual({ kind: 'hold' });
  });

  it('holds when the new band stretch is under 60 seconds', () => {
    // Arrange / Act / Assert
    expect(decideMusicAction(PLAYING_A, 6, 600000, TRACKS, {}, () => 0, 30)).toEqual({ kind: 'hold' });
  });

  it('changes to another track when the band changes, the track no longer fits, and both minimums are met', () => {
    // Arrange / Act
    const action = decideMusicAction(PLAYING_A, 5, 90000, TRACKS, {}, () => 0, 60);

    // Assert
    expect(action).toEqual({ kind: 'play', track: track('b') });
  });
});
