import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import { STORAGE_KEYS } from '@/lib/client/models/storage-keys';

describe('spotifyFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when no auth is stored', async () => {
    // Arrange
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Act / Assert
    await expect(spotifyFetch('/me/player/devices')).rejects.toThrow('Spotify not connected');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the bearer header', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await spotifyFetch('/me/player/devices', { headers: { 'X-Test': '1' } });

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('https://api.spotify.com/v1/me/player/devices');
    expect(headers.get('Authorization')).toBe('Bearer token-a');
    expect(headers.get('X-Test')).toBe('1');
  });

  it('refreshes and saves the token when it is about to expire', async () => {
    // Arrange
    saveSpotifyAuth({ accessToken: 'old', refreshToken: 'refresh-a', expiresAt: Date.now() + 10000 });
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ spotifyClientId: 'client-1' }));
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://accounts.spotify.com/api/token') {
        return Promise.resolve(new Response(JSON.stringify({ access_token: 'new', expires_in: 3600 })));
      }
      return Promise.resolve(new Response('{}'));
    });
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await spotifyFetch('/me/player');

    // Assert
    const saved = loadSpotifyAuth();
    expect(saved?.accessToken).toBe('new');
    expect(saved?.refreshToken).toBe('refresh-a');
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer new');
  });
});
