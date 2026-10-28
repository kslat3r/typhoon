import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import type { SpotifyPlaylist } from '@/lib/client/models/types';

interface PlaylistsPage {
  items: { id: string; name: string }[];
  next: string | null;
}

export default async function getSpotifyPlaylists(): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let path: string | null = '/me/playlists?limit=50';

  while (path !== null) {
    let response: Response;
    try {
      response = await spotifyFetch(path);
    } catch (error) {
      throw new Error('Get playlists failed at the request', { cause: error });
    }
    if (!response.ok) {
      throw new Error(`Get playlists failed: ${response.status}`);
    }

    let page: PlaylistsPage;
    try {
      page = (await response.json()) as PlaylistsPage;
    } catch (error) {
      throw new Error('Get playlists failed at reading the response', { cause: error });
    }

    for (const item of page.items) {
      playlists.push({ id: item.id, name: item.name });
    }
    path = page.next === null ? null : page.next.replace('https://api.spotify.com/v1', '');
  }

  return playlists;
}
