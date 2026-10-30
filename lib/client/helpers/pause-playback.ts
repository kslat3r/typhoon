import { SPOTIFY_DEVICE_NAME } from '@/lib/client/helpers/connect-spotify-player';
import loadSpotifyAuth from '@/lib/client/helpers/load-spotify-auth';
import spotifyFetch from '@/lib/client/helpers/spotify-fetch';

function deviceName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('device' in body)) {
    return null;
  }
  const device = body.device;
  if (typeof device !== 'object' || device === null || !('name' in device) || typeof device.name !== 'string') {
    return null;
  }
  return device.name;
}

// Stops music this app started. Playback on another Spotify device is left alone,
// and a network failure does not undo the saved setting.
export default async function pausePlayback(): Promise<void> {
  if (loadSpotifyAuth() === null) {
    return;
  }

  try {
    const current = await spotifyFetch('/me/player');
    if (!current.ok || current.status === 204) {
      return;
    }
    if (deviceName(await current.json()) !== SPOTIFY_DEVICE_NAME) {
      return;
    }
    await spotifyFetch('/me/player/pause', { method: 'PUT' });
  } catch {
    // Spotify is unreachable. The music setting is already saved.
  }
}
