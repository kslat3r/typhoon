import { beforeEach, describe, expect, it, vi } from 'vitest';
import decideMusicAction from '@/lib/client/helpers/decide-music-action';
import type { MusicState, Track } from '@/lib/client/models/types';

function track(id: string): Track {
  return { id, uri: `spotify:track:${id}`, name: id, artist: 'artist', artworkUrl: null, durationMs: 180000 };
}

describe('decideMusicAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays when there is no current track and tracks exist', () => {
    // Arrange
    const state: MusicState = { track: null, startedAt: 0, zone: 2 };

    // Act
    const action = decideMusicAction(state, 2, 0, [track('a')], {}, () => 0);

    // Assert
    expect(action).toEqual({ kind: 'play', track: track('a') });
  });

  it('holds when the current track has played under 60 seconds', () => {
    // Arrange
    const state: MusicState = { track: track('a'), startedAt: 0, zone: 1 };

    // Act
    const action = decideMusicAction(state, 5, 30000, [track('a'), track('b')], {}, () => 0);

    // Assert
    expect(action).toEqual({ kind: 'hold' });
  });

  it('plays a different track on a jump of three', () => {
    // Arrange
    const state: MusicState = { track: track('a'), startedAt: 0, zone: 1 };

    // Act
    const action = decideMusicAction(state, 4, 90000, [track('a'), track('b')], {}, () => 0);

    // Assert
    expect(action).toEqual({ kind: 'play', track: track('b') });
  });

  it('holds when there are no tracks', () => {
    // Arrange
    const state: MusicState = { track: null, startedAt: 0, zone: 1 };

    // Act
    const action = decideMusicAction(state, 4, 90000, [], {}, () => 0);

    // Assert
    expect(action).toEqual({ kind: 'hold' });
  });
});
