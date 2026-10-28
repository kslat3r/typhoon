import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getPlaylistTracks from '@/lib/client/helpers/get-playlist-tracks';
import saveSpotifyAuth from '@/lib/client/helpers/save-spotify-auth';

function item(id: string, images: { url: string; width: number }[]): object {
  return {
    item: {
      type: 'track',
      id,
      uri: `spotify:track:${id}`,
      name: `Name ${id}`,
      duration_ms: 1000,
      artists: [{ name: `Artist ${id}` }, { name: 'Other' }],
      album: { images },
    },
  };
}

describe('getPlaylistTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    saveSpotifyAuth({ accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 3600000 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows paging and maps items to tracks', async () => {
    // Arrange
    const pageTwoUrl = 'https://api.spotify.com/v1/playlists/p1/items?offset=100&limit=100';
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === pageTwoUrl) {
        return Promise.resolve(new Response(JSON.stringify({ items: [item('b', [])], next: null })));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [
              item('a', [{ url: 'big', width: 640 }, { url: 'small', width: 64 }]),
              { item: null },
              { item: { type: 'track', id: null, uri: 'spotify:local:x', name: 'Local' } },
              { item: { type: 'episode', id: 'e1', uri: 'spotify:episode:e1', name: 'Episode', duration_ms: 1000, artists: [], album: { images: [] } } },
            ],
            next: pageTwoUrl,
          }),
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    // Act
    const tracks = await getPlaylistTracks('p1');

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.spotify.com/v1/playlists/p1/items?limit=100');
    expect(tracks).toEqual([
      { id: 'a', uri: 'spotify:track:a', name: 'Name a', artist: 'Artist a', artworkUrl: 'small', durationMs: 1000 },
      { id: 'b', uri: 'spotify:track:b', name: 'Name b', artist: 'Artist b', artworkUrl: null, durationMs: 1000 },
    ]);
  });

  it('throws a clear message when the playlist contents are not available', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    // Act / Assert
    await expect(getPlaylistTracks('p1')).rejects.toThrow('Playlist not available: choose a playlist you own');
  });
});
