import spotifyFetch from '@/lib/client/helpers/spotify-fetch';
import type { Track } from '@/lib/client/models/types';

interface TracksPage {
  items: {
    track: {
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
  let path: string | null = `/playlists/${playlistId}/tracks?limit=100`;

  while (path !== null) {
    let response: Response;
    try {
      response = await spotifyFetch(path);
    } catch (error) {
      throw new Error('Get playlist tracks failed at the request', { cause: error });
    }
    if (!response.ok) {
      throw new Error(`Get playlist tracks failed: ${response.status}`);
    }

    let page: TracksPage;
    try {
      page = (await response.json()) as TracksPage;
    } catch (error) {
      throw new Error('Get playlist tracks failed at reading the response', { cause: error });
    }

    for (const item of page.items) {
      if (item.track === null || item.track.id === null) {
        continue;
      }
      const images = [...item.track.album.images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      tracks.push({
        id: item.track.id,
        uri: item.track.uri,
        name: item.track.name,
        artist: item.track.artists[0]?.name ?? '',
        artworkUrl: images.length > 0 ? images[0].url : null,
        durationMs: item.track.duration_ms,
      });
    }
    path = page.next === null ? null : page.next.replace('https://api.spotify.com/v1', '');
  }

  return tracks;
}
