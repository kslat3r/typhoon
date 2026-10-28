import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import type { Track } from '@/lib/client/models/types';

interface ItemsPage {
  items: {
    item: {
      type?: string;
      id: string | null;
      uri: string;
      name: string;
      duration_ms: number;
      artists: { name: string }[];
      album: { images: { url: string; width: number | null }[] };
    } | null;
  }[];
  next: string | null;
}

export default async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const tracks: Track[] = [];
  let path: string | null = `/playlists/${playlistId}/items?limit=100`;

  while (path !== null) {
    let response: Response;
    try {
      response = await spotifyFetch(path);
    } catch (error) {
      throw new Error('Get playlist tracks failed at the request', { cause: error });
    }
    if (response.status === 403 || response.status === 404) {
      throw new Error('Playlist not available: choose a playlist you own');
    }
    if (!response.ok) {
      throw new Error(`Get playlist tracks failed: ${response.status}`);
    }

    let page: ItemsPage;
    try {
      page = (await response.json()) as ItemsPage;
    } catch (error) {
      throw new Error('Get playlist tracks failed at reading the response', { cause: error });
    }

    for (const entry of page.items) {
      const item = entry.item;
      if (item === null || item === undefined || !item.id || item.type !== 'track') {
        continue;
      }
      const images = [...item.album.images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      tracks.push({
        id: item.id,
        uri: item.uri,
        name: item.name,
        artist: item.artists[0]?.name ?? '',
        artworkUrl: images.length > 0 ? images[0].url : null,
        durationMs: item.duration_ms,
      });
    }
    path = page.next === null ? null : page.next.replace('https://api.spotify.com/v1', '');
  }

  return tracks;
}
