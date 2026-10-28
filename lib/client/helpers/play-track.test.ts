import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import playTrack from '@/lib/client/helpers/play-track';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';

describe('playTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays on the active device when no device is given', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await playTrack('spotify:track:a');

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.spotify.com/v1/me/player/play');
  });

  it('appends the device_id query when a device is given', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await playTrack('spotify:track:a', 'device 1');

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.spotify.com/v1/me/player/play?device_id=device%201');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ uris: ['spotify:track:a'] }));
  });
});
