import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pausePlayback from '@/lib/client/helpers/pause-playback';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';

function playerResponse(deviceName: string | null, status = 200): Response {
  if (status === 204) {
    return new Response(null, { status });
  }
  return new Response(JSON.stringify({ device: deviceName === null ? null : { name: deviceName }, is_playing: true }), { status });
}

describe('pausePlayback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when Spotify is not connected', async () => {
    // Arrange
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await pausePlayback();

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pauses playback on the Typhoon device', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/me/player')) {
        return playerResponse('Typhoon');
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await pausePlayback();

    // Assert
    const urls = fetchMock.mock.calls.map((call) => call[0]);
    expect(urls).toEqual(['https://api.spotify.com/v1/me/player', 'https://api.spotify.com/v1/me/player/pause']);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');
  });

  it('leaves playback on another device alone', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
    const fetchMock = vi.fn(async (_url: string) => playerResponse('Phone'));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await pausePlayback();

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.spotify.com/v1/me/player');
  });

  it('still resolves when nothing is playing or Spotify cannot be reached', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(playerResponse(null, 204))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    // Act / Assert
    await expect(pausePlayback()).resolves.toBeUndefined();
    await expect(pausePlayback()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.every((call) => call[0] !== 'https://api.spotify.com/v1/me/player/pause')).toBe(true);
  });
});
